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
export function builder(yargs: Argv<any>): Argv<any> {
  return yargs
    .options({
      queryRegex: {
        type: 'string',
        alias: 'q',
        describe: 'Regex for queries to include (before any label overrides). ' +
          'Examples: \'^C\', \'^[^C]\', ...',
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
      failures: {
        type: 'boolean',
        describe: 'If the number of failed query instantiations in the experiment must be reported',
        default: false,
      },
    });
}
export function handler(argv: Record<string, any>): Promise<void> {
  return wrapCommandHandler(
    argv,
    async(context: ITaskContext) => wrapVisualProgress('Collecting ghbench data', async() => {
    // Load options
      const { experimentDirectories, experimentNames } = getExperimentNames(argv);
      const queryRegex = argv.queryRegex ? new RegExp(argv.queryRegex, 'u') : undefined;

      // Collect timings
      const ghbenchData: GhbenchData = [];
      for (const [ experimentId, experimentDirectory ] of experimentDirectories.entries()) {
        const ghbenchDataRaw: Record<string, GhbenchDataRaw> = {};

        await handleCsvFile(experimentDirectory, argv, (data) => {
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
          const successValues = entry.values.filter((val, index) => entry.extra.error[index] !== 'true');
          // Queries that failed for all instantiations have no time, so they must not be reported as 0
          if (successValues.length === 0) {
            continue;
          }
          const value = calcMedian(successValues);
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

        // Output failures, as failed queries have no time to report
        if (argv.failures) {
          const failedQueries = Object.entries(ghbenchDataRaw)
            .map(([ name, entry ]) => ({
              name,
              failed: entry.extra.error.filter(error => error === 'true').length,
              count: entry.extra.error.length,
            }))
            .filter(entry => entry.failed > 0);
          ghbenchData.push({
            name: `${experimentNames[experimentId]} - failed queries`,
            unit: 'failed instantiations',
            value: failedQueries.reduce((sum, entry) => sum + entry.failed, 0),
            extra: failedQueries.length > 0 ?
              failedQueries.map(entry => `${entry.name}: ${entry.failed}/${entry.count} failed`).join('; ') :
              'None',
          });
        }
      }

      // Write output
      // eslint-disable-next-line no-sync
      fs.writeFileSync(Path.join(context.cwd, `${argv.name}`), JSON.stringify(ghbenchData, null, '  '), 'utf8');
    }),
  );
}

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
