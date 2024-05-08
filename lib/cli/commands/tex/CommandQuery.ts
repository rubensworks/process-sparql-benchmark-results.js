import * as fs from 'fs';
import Path from 'path';

import type { Argv } from 'yargs';
import { instantiateTemplate } from '../../../TemplateUtils';
import { wrapCommandHandler, wrapVisualProgress } from '../../CliHelpers';

import type { ITaskContext } from '../../ITaskContext';
import {

  getColorScheme,
  getExperimentNames,
  getQueryNames,
  handleCsvFile,
  relabelQueryNames,
  toSvg,
} from './TexUtils';

export const command = 'query <experiment-dir...>';
export const desc = 'Plot the query execution times from the given experiments';
export const builder = (yargs: Argv<any>): Argv<any> =>
  yargs
    .options({
      queryRegex: {
        type: 'string',
        alias: 'q',
        describe: 'Regex for queries to include (before any label overrides). Examples: \'^C\', \'^[^C]\', ...',
      },
      name: {
        type: 'string',
        alias: 'n',
        describe: 'Custom output file name',
        default: 'plot_queries_data',
      },
      color: {
        type: 'string',
        alias: 'c',
        describe: 'Color scheme name from colorbrewer2.org',
      },
      maxY: {
        type: 'number',
        describe: 'The upper limit of the Y-axis. Defaults to maximum Y value',
      },
      legend: {
        type: 'boolean',
        describe: 'If a legend should be included',
        default: true,
      },
      legendPos: {
        type: 'string',
        describe: 'The legend position X,Y (anchor north-east)',
        default: '1.0,1.0',
      },
      logY: {
        type: 'boolean',
        describe: 'If the Y-Axis must have a log scale',
        default: false,
      },
      inputName: {
        type: 'string',
        describe: 'Custom input file name per experiment',
        default: 'query-times.csv',
      },
      inputDelimiter: {
        type: 'string',
        describe: 'Delimiter for the input CSV file',
        default: ';',
      },
      overrideCombinationLabels: {
        type: 'string',
        describe: 'Comma-separated list of combination labels to use',
      },
      overrideQueryLabels: {
        type: 'string',
        describe: 'Comma-separated list of query labels to use',
      },
      zeroReplacement: {
        type: 'number',
        describe: 'If zero values occur, what values they should be replaced with',
        default: 0,
      },
      svg: {
        type: 'boolean',
        describe: 'If the tex file should be converted to svg via the tex2svg command',
        default: false,
      },
      metric: {
        type: 'string',
        describe: 'The metric to plot',
        choices: [ 'time', 'httpRequests' ],
        default: 'time',
      },
      relative: {
        type: 'boolean',
        describe: 'If the maximum value per query should be set to 1, and all other values made relative to that.',
        default: false,
      },
    });
export const handler = (argv: Record<string, any>): Promise<void> => wrapCommandHandler(argv,
  async(context: ITaskContext) => wrapVisualProgress('Plotting data', async() => {
    // Load CLI args
    const { experimentDirectories, experimentNames, experimentIds } = getExperimentNames(argv);
    const queryRegex = argv.queryRegex ? new RegExp(argv.queryRegex, 'u') : undefined;
    const colorScheme = getColorScheme(argv, experimentDirectories);
    const metric = argv.metric;

    // Prepare query CSV file with averages per query group
    let queryNames: string[] | undefined;
    let outputCsvEntries: Record<string, number[]> = {};
    const maxQueryValues: Record<string, number> = {};
    for (const experimentDirectory of experimentDirectories) {
      // Read CSV file
      const totals: Record<string, number[]> = {};
      const totalsFirst: Record<string, number[]> = {};
      await handleCsvFile(experimentDirectory, argv, data => {
        if (!queryRegex || queryRegex.test(data.name)) {
          if (!(data.name in totals)) {
            totals[data.name] = [];
          }

          let value = Number.parseInt(data[metric] || '0', 10);
          value = Math.max(argv.zeroReplacement, value);

          totals[data.name].push(value);

          if (data.timestamps) {
            if (!(data.name in totalsFirst)) {
              totalsFirst[data.name] = [];
            }
            totalsFirst[data.name].push(Number.parseInt(data.timestamps.split(' ')[0], 10));
          }
        }
      });

      // Calculate average
      const averages: Record<string, number> = {};
      const averageMinus: Record<string, number> = {};
      const averagePlus: Record<string, number> = {};
      for (const [ query, times ] of Object.entries(totals)) {
        const average = times.reduce((sum, current) => sum + current) / times.length;
        averages[query] = average;
        averageMinus[query] = average - times.reduce((minV, value) => Math.min(value, minV));
        const maxValue = times.reduce((maxV, value) => Math.max(value, maxV));
        averagePlus[query] = maxValue - average;

        if (!(query in maxQueryValues)) {
          maxQueryValues[query] = maxValue;
        } else {
          maxQueryValues[query] = Math.max(maxQueryValues[query], maxValue);
        }
      }
      const averagesFirst: Record<string, number> = {};
      const averageFirstMinus: Record<string, number> = {};
      const averageFirstPlus: Record<string, number> = {};
      for (const [ query, times ] of Object.entries(totalsFirst)) {
        const average = times.reduce((sum, current) => sum + current) / times.length;
        averagesFirst[query] = average;
        averageFirstMinus[query] = average - times.reduce((minV, value) => Math.min(value, minV));
        const maxValue = times.reduce((maxV, value) => Math.max(value, maxV));
        averageFirstPlus[query] = maxValue - average;
      }

      // Set query names and count
      if (!queryNames) {
        queryNames = Object.keys(averages);
        for (const queryName of queryNames) {
          outputCsvEntries[queryName] = [];
        }
      } else if (queryNames.join(',') !== Object.keys(averages).join(',')) {
        throw new Error(`Tried to plot experiments with different query sets`);
      }

      // Append average, min, and max result
      for (const queryName of queryNames) {
        outputCsvEntries[queryName].push(
          averages[queryName],
          averageMinus[queryName],
          averagePlus[queryName],
        );
        if (metric === 'time') {
          outputCsvEntries[queryName].push(
            averagesFirst[queryName] || Number.NaN,
            averageFirstMinus[queryName] || Number.NaN,
            averageFirstPlus[queryName] || Number.NaN,
          );
        }
      }
    }
    if (!queryNames) {
      throw new Error(`No queries could be found`);
    }
    if (argv.relative) {
      // Make values relative per query
      for (const queryName of Object.keys(outputCsvEntries)) {
        outputCsvEntries[queryName] = outputCsvEntries[queryName].map(value => value / maxQueryValues[queryName]);
      }
    }
    // Determine query labels
    queryNames = getQueryNames(queryNames, argv);
    outputCsvEntries = relabelQueryNames(outputCsvEntries, queryNames);

    // Write output CSV file
    const csvOutputStream = fs.createWriteStream(Path.join(context.cwd, `${argv.name}.csv`));
    csvOutputStream.write(`query;${experimentIds.map(id => {
      let value = `${id}-mean;${id}-minus;${id}-plus`;
      if (metric === 'time') {
        value = `${value};${id}-first-mean;${id}-first-minus;${id}-first-plus`;
      }
      return value;
    }).join(';')}\n`);
    for (const [ key, columns ] of Object.entries(outputCsvEntries)) {
      csvOutputStream.write(`${key};${columns.join(';')}\n`);
    }
    csvOutputStream.close();

    // Prepare bar lines
    let barLines = experimentNames
      .map((name, id) => {
        const offset = (id - ((experimentNames.length - 1) / 2)) * 2.75;
        const yModifier = metric === 'time' && !argv.relative ? ' / 1000' : '';
        return `\\addplot+[ybar, xshift=${offset}pt,legend image post style={xshift=${-offset}pt}] table [x=query, y expr=(\\thisrow{${id}-mean}${yModifier}), y error plus expr=(\\thisrow{${id}-plus}${yModifier}), y error minus expr=(\\thisrow{${id}-minus}${yModifier}), col sep=semicolon]{"${argv.name}.csv"};`;
      })
      .join('\n');
    if (metric === 'time') {
      const extraBarLines = experimentNames
        .map((name, id) => {
          const offset = (id - ((experimentNames.length - 1) / 2)) * 2.75;
          const yModifier = metric === 'time' && !argv.relative ? ' / 1000' : '';
          return `\\addplot+[only marks,xshift=${offset}pt,mark=star,mark options={color=gray,scale=0.5}] table [x=query, y expr=(\\thisrow{${id}-first-mean}${yModifier}), col sep=semicolon]{"${argv.name}.csv"};`;
        })
        .join('\n');
      barLines = `${barLines}\n${extraBarLines}`;
    }

    // Instantiate template
    await instantiateTemplate(
      Path.join(context.templatesRoot, 'tex', 'plot_query_data.tex'),
      Path.join(context.cwd, `${argv.name}.tex`),
      {
        X_LIMITS: experimentDirectories.length * 2,
        WIDTH: queryNames.length * (experimentNames.length + 1) * 4,
        QUERIES: queryNames.join(','),
        LEGEND: experimentNames.map(name => name.replace(/_/gu, '\\_')).join(','),
        BARS: barLines,
        COLOR_SCHEME: colorScheme,
        LEGEND_POS: argv.legendPos,
        ...argv.maxY ? { Y_MAX: `ymax=${argv.maxY},` } : {},
      },
      contents => {
        if (!argv.legend) {
          contents = contents.replace(/\\legend\{.*\}/ug, '');
        }
        if (argv.logY) {
          contents = contents
            .replace(/ymin=0,/u, 'ymin=0.000001,ymode=log,log origin=infty,log basis y={10},')
            .replace(/ \/ 1000\)/ug, ' / 1000)+1e-5');
        }
        if (argv.relative) {
          contents = contents.replace('ylabel={Duration (s)},', 'ylabel={},');
        }
        if (metric === 'httpRequests') {
          contents = contents.replace('ylabel={Duration (s)},', 'ylabel={HTTP Requests},');
        }
        return contents;
      },
    );

    // Render CSV from TeX
    if (argv.svg) {
      await toSvg(argv, context);
    }
  }));
