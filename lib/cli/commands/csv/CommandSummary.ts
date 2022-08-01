import * as fs from 'fs';
import Path from 'path';

import type { Argv } from 'yargs';

import { wrapCommandHandler, wrapVisualProgress } from '../../CliHelpers';

import type { ITaskContext } from '../../ITaskContext';
import { getExperimentNames, getQueryNames, handleCsvFile, relabelQueryNames } from '../tex/TexUtils';
import { TableSerializerCsv } from './TableSerializerCsv';
import { TableSerializerMarkdown } from './TableSerializerMarkdown';

export const command = 'summary <experiment-dir...>';
export const desc = 'Summarize query results from the given experiments in a table';
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
        default: 'data_summary.csv',
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
      markdown: {
        type: 'boolean',
        describe: 'If the output should be serialized as markdown',
        default: false,
      },
    });
export const handler = (argv: Record<string, any>): Promise<void> => wrapCommandHandler(argv,
  async(context: ITaskContext) => wrapVisualProgress('Summarizing data', async() => {
    // Load options
    const { experimentDirectories, experimentNames } = getExperimentNames(argv);
    const queryRegex = argv.queryRegex ? new RegExp(argv.queryRegex, 'u') : undefined;

    // Prepare output CSV file
    const os = fs.createWriteStream(Path.join(context.cwd, `${argv.name}`));
    const serializer = argv.markdown ? new TableSerializerMarkdown(os) : new TableSerializerCsv(os);
    serializer.writeHeader([ 'Experiment', 'Query', 'Time', 'Results', 'Timeout' ]);

    // Collect data from all experiments
    for (const [ experimentId, experimentDirectory ] of experimentDirectories.entries()) {
      // Read CSV file
      const timesTotal: Record<string, number[]> = {};
      let results: Record<string, number> = {};
      let timeout: Record<string, boolean> = {};
      await handleCsvFile(experimentDirectory, argv, data => {
        if (!queryRegex || queryRegex.test(data.name)) {
          if (!(data.name in timesTotal)) {
            timesTotal[data.name] = [];
          }
          timesTotal[data.name].push(Number.parseInt(data.time, 10));

          results[data.name] = data.results;
          timeout[data.name] = data.error;
        }
      });

      // Calculate average
      let timesAverage: Record<string, number> = {};
      for (const [ query, times ] of Object.entries(timesTotal)) {
        const average = times.reduce((sum, current) => sum + current) / times.length;
        timesAverage[query] = average;
      }

      // Determine query names
      const queryNames = getQueryNames(Object.keys(results), argv);
      timesAverage = relabelQueryNames(timesAverage, queryNames);
      results = relabelQueryNames(results, queryNames);
      timeout = relabelQueryNames(timeout, queryNames);

      // Write rows in output file
      for (const [ query, time ] of Object.entries(timesAverage)) {
        serializer.writeRow([
          experimentNames[experimentId],
          query,
          `${time}`,
          `${results[query]}`,
          `${timeout[query]}`,
        ]);
      }
    }

    // Close output CSV file
    serializer.close();
  }));
