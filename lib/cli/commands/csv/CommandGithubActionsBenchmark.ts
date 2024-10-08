import * as fs from 'fs';
import Path from 'path';
import type { Argv } from 'yargs';
import { wrapCommandHandler, wrapVisualProgress } from '../../CliHelpers';
import type { ITaskContext } from '../../ITaskContext';
import {
  calcMedian,
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
      total: {
        type: 'boolean',
        describe: 'If total execution time across the experiment must be reported',
        default: false,
      },
      detailed: {
        type: 'boolean',
        describe: 'If separate execution time for each query in the experiment must be reported',
        default: true,
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
      const ghbenchDataRaw: Record<string, GhbenchDataRaw> = {};

      await handleCsvFile(experimentDirectory, argv, data => {
        if (!queryRegex || queryRegex.test(data.name)) {
          const value = Number.parseInt(data.time, 10);
          if (!ghbenchDataRaw[data.name]) {
            ghbenchDataRaw[data.name] = {
              name: `${experimentNames[experimentId]} - ${data.name}`,
              unit: 'ms',
              values: [ value ],
              extra: {
                results: [ data.results ],
                error: [ data.error ],
                httpRequests: [ data.httpRequests ],
              },
            };
          } else {
            ghbenchDataRaw[data.name].values.push(value);
            ghbenchDataRaw[data.name].extra.results.push(data.results);
            ghbenchDataRaw[data.name].extra.error.push(data.error);
            ghbenchDataRaw[data.name].extra.httpRequests.push(data.httpRequests);
          }
        }
      });

      // Calculate averages
      let total = 0;
      for (const entry of Object.values(ghbenchDataRaw)) {
        const value = calcMedian(entry.values.filter((val, index) => entry.extra.error[index] !== 'true')) || 0;
        if (!Number.isNaN(value)) {
          total += value;
        }

        // Output detailed
        if (argv.detailed) {
          ghbenchData.push({
            name: entry.name,
            unit: entry.unit,
            value,
            extra: `Results: [${entry.extra.results}]; Error: [${entry.extra.error}]; HTTP Requests: [${entry.extra.httpRequests}]`,
          });
        }
      }

      // Output totals
      if (argv.total) {
        ghbenchData.push({
          name: `${experimentNames[experimentId]}`,
          unit: 'ms',
          value: total,
        });
      }
    }

    // Write output
    // eslint-disable-next-line no-sync
    fs.writeFileSync(Path.join(context.cwd, `${argv.name}`), JSON.stringify(ghbenchData, null, '  '), 'utf8');
  }));

interface GhbenchDataRaw {
  name: string;
  unit: string;
  values: number[];
  range?: string;
  extra: { results: number[]; error: string[]; httpRequests: number[] };
}

type GhbenchData = {
  name: string;
  unit: string;
  value: number;
  range?: string;
  extra?: string;
}[];
