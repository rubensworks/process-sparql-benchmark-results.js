import * as fs from 'fs';
import Path from 'path';

import type { Argv } from 'yargs';
import { instantiateTemplate } from '../../../TemplateUtils';
import { wrapCommandHandler, wrapVisualProgress } from '../../CliHelpers';

import type { ITaskContext } from '../../ITaskContext';
import { getColorScheme, getExperimentNames, handleCsvFile, toSvg } from './TexUtils';

export const command = 'queryTimes <query> <experiment-dir...>';
export const desc = 'Plot the query result arrival times from the given experiments';
export const builder = (yargs: Argv<any>): Argv<any> =>
  yargs
    .options({
      name: {
        type: 'string',
        alias: 'n',
        describe: 'Custom output file name',
        default: 'query_times',
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
      svg: {
        type: 'boolean',
        describe: 'If the tex file should be converted to svg via the tex2svg command',
        default: false,
      },
    });
export const handler = (argv: Record<string, any>): Promise<void> => wrapCommandHandler(argv,
  async(context: ITaskContext) => wrapVisualProgress('Plotting data', async() => {
    // Load CLI args
    const query: string = argv.query;
    const { experimentDirectories, experimentNames, experimentIds } = getExperimentNames(argv);
    const colorScheme = getColorScheme(argv, experimentDirectories);

    // Load query times from CSV files
    const resultsArrivalTimes: Record<string, string>[] = [];
    for (const [ experimentId, experimentDirectory ] of experimentDirectories.entries()) {
      // Read CSV file
      let foundQuery = false;
      await handleCsvFile(experimentDirectory, argv, data => {
        if (!foundQuery && data.name === query) {
          foundQuery = true;
          const times: string[] = data.timestamps.split(/[ ,]/u);
          for (const [ i, time ] of times.entries()) {
            if (i >= resultsArrivalTimes.length) {
              resultsArrivalTimes.push({});
            }
            resultsArrivalTimes[i][experimentId] = time;
          }
        }
      });
    }

    // Write output CSV file
    const csvOutputStream = fs.createWriteStream(Path.join(context.cwd, `${argv.name}.csv`));
    csvOutputStream.write(`${experimentNames.join(';')}\n`);
    for (const resultArrivalTimes of resultsArrivalTimes) {
      let first = true;
      for (const experimentId of experimentIds) {
        if (first) {
          first = false;
        } else {
          csvOutputStream.write(`;`);
        }
        csvOutputStream.write(`${resultArrivalTimes[experimentId] || ''}`);
      }
      csvOutputStream.write(`\n`);
    }
    csvOutputStream.close();

    // Prepare bar lines
    const lines = experimentNames
      .map((name, id) => `\\addplot+[mark=none] table [y expr=\\coordindex+1, x=${name}, col sep=semicolon]{"${argv.name}.csv"};`)
      .join('\n');

    // Instantiate template
    await instantiateTemplate(
      Path.join(context.templatesRoot, 'tex', 'plot_query_times.tex'),
      Path.join(context.cwd, `${argv.name}.tex`),
      {
        LEGEND: experimentNames.map(name => name.replace(/_/gu, '\\_')).join(','),
        LINES: lines,
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
