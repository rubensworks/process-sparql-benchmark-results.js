import * as fs from 'fs';
import Path from 'path';
import type { Argv } from 'yargs';
import { wrapCommandHandler, wrapVisualProgress } from '../../CliHelpers';
import type { ITaskContext } from '../../ITaskContext';
import {
  getExperimentNames,
  handleCsvFile,
} from '../tex/TexUtils';

export const command = 'ghbench <experiment-dir...>';
export const desc = 'Generates a JSON file for usage in the Benchmark Github Action';
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
        default: 'ghbench.json',
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
    });
export const handler = (argv: Record<string, any>): Promise<void> => wrapCommandHandler(argv,
  async(context: ITaskContext) => wrapVisualProgress('Collecting ghbench data', async() => {
    // Load options
    const { experimentDirectories, experimentNames } = getExperimentNames(argv);
    const queryRegex = argv.queryRegex ? new RegExp(argv.queryRegex, 'u') : undefined;

    // Collect timings
    const ghbenchData: GhbenchData = [];
    for (const [ experimentId, experimentDirectory ] of experimentDirectories.entries()) {
      const times: Record<string, Record<string, number>> = {};

      await handleCsvFile(experimentDirectory, argv, data => {
        if (!queryRegex || queryRegex.test(data.name)) {
          if (!times[experimentId]) {
            times[experimentId] = {};
          }
          if (!times[experimentId][data.name]) {
            times[experimentId][data.name] = 0;
          }
          times[experimentId][data.name] += Number.parseInt(data.time, 10);

          ghbenchData.push({
            name: `${experimentNames[experimentId]} - ${data.name}.${data.id}`,
            unit: 'ms',
            value: Number.parseInt(data.results, 10),
            extra: `Results: ${data.results}; Error: ${data.error}; HTTP Requests: ${data.httpRequests}`,
          });
        }
      });
    }

    // Write output
    // eslint-disable-next-line no-sync
    fs.writeFileSync(Path.join(context.cwd, `${argv.name}`), JSON.stringify(ghbenchData, null, '  '), 'utf8');
  }));

type GhbenchData = {
  name: string;
  unit: string;
  value: number;
  range?: string;
  extra?: string;
}[];