import * as fs from 'fs';
import Path from 'path';

import type { Argv } from 'yargs';
import { instantiateTemplate } from '../../../TemplateUtils';
import { wrapCommandHandler, wrapVisualProgress } from '../../CliHelpers';

import type { ITaskContext } from '../../ITaskContext';
import { getColorScheme, getExperimentNames, handleCsvFile, toSvg } from './TexUtils';

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
      svg: {
        type: 'boolean',
        describe: 'If the tex file should be converted to svg via the tex2svg command',
        default: false,
      },
    });
export const handler = (argv: Record<string, any>): Promise<void> => wrapCommandHandler(argv,
  async(context: ITaskContext) => wrapVisualProgress('Plotting data', async() => {
    // Load CLI args
    const { experimentDirectories, experimentNames, experimentIds } = getExperimentNames(argv);
    const queryRegex = argv.queryRegex ? new RegExp(argv.queryRegex, 'u') : undefined;
    const colorScheme = getColorScheme(argv, experimentDirectories);

    // Prepare query CSV file with averages per query group
    let queryNames: string[] | undefined;
    const outputCsvEntries: Record<string, number[]> = {};
    for (const experimentDirectory of experimentDirectories) {
      // Read CSV file
      const totals: Record<string, number[]> = {};
      await handleCsvFile(experimentDirectory, argv, data => {
        if (!queryRegex || queryRegex.test(data.name)) {
          if (!(data.name in totals)) {
            totals[data.name] = [];
          }
          totals[data.name].push(Number.parseInt(data.time, 10));
        }
      });

      // Calculate average
      const averages: Record<string, number> = {};
      for (const [ query, times ] of Object.entries(totals)) {
        const average = times.reduce((sum, current) => sum + current) / times.length;
        averages[query] = average;
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

      // Append averaged result
      for (const queryName of queryNames) {
        outputCsvEntries[queryName].push(averages[queryName]);
      }
    }
    if (!queryNames) {
      throw new Error(`No queries could be found`);
    }
    // Determine query labels
    if (argv.overrideQueryLabels) {
      const overrideQueryLabels: string[] = argv.overrideQueryLabels.split(',');
      if (overrideQueryLabels.length !== queryNames.length) {
        throw new Error(`Invalid query labels override, expected ${queryNames.length} labels while ${overrideQueryLabels.length} where given`);
      }
      // Relabel outputCsvEntries entries
      for (const [ i, queryName ] of queryNames.entries()) {
        const averages = outputCsvEntries[queryName];
        delete outputCsvEntries[queryName];
        outputCsvEntries[overrideQueryLabels[i]] = averages;
      }
      queryNames = overrideQueryLabels;
    }

    // Write output CSV file
    const csvOutputStream = fs.createWriteStream(Path.join(context.cwd, `${argv.name}.csv`));
    csvOutputStream.write(`query;${experimentIds.join(';')}\n`);
    for (const [ key, columns ] of Object.entries(outputCsvEntries)) {
      csvOutputStream.write(`${key};${columns.join(';')}\n`);
    }
    csvOutputStream.close();

    // Prepare bar lines
    const barLines = experimentNames
      .map((name, id) => `\\addplot+[ybar] table [x=query, y expr=\\thisrow{${id}} / 1000, col sep=semicolon]{"${argv.name}.csv"};`)
      .join('\n');

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
          contents = contents.replace(/^\\legend.*$/u, '');
        }
        if (argv.logY) {
          contents = contents.replace(/^ymin=0,$/u, 'ymode=log,log origin=infty,');
        }
        return contents;
      },
    );

    // Render CSV from TeX
    if (argv.svg) {
      await toSvg(argv, context);
    }
  }));
