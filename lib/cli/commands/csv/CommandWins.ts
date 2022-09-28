import * as fs from 'fs';
import Path from 'path';
import type { Argv } from 'yargs';
import { constructCorrectnessChecker } from '../../../correctness/CorrectnessCheckerUtils';
import { wrapCommandHandler, wrapVisualProgress } from '../../CliHelpers';
import type { ITaskContext } from '../../ITaskContext';
import {

  getExperimentNames,

  handleCsvFile,
} from '../tex/TexUtils';
import { TableSerializerCsv } from './TableSerializerCsv';
import { TableSerializerMarkdown } from './TableSerializerMarkdown';

export const command = 'wins <experiment-dir...>';
export const desc = 'Show distribution of query wins from the given experiments in a table';
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
        default: 'data_wins.csv',
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
      markdown: {
        type: 'boolean',
        describe: 'If the output should be serialized as markdown',
        default: false,
      },
      correctnessReference: {
        type: 'string',
        describe: 'Path to a JSON file mapping queries to expected cardinality',
        default: '',
      },
      markRows: {
        type: 'string',
        describe: 'Comma-separated list of row id\'s to mark (markdown-only)',
      },
    });
export const handler = (argv: Record<string, any>): Promise<void> => wrapCommandHandler(argv,
  async(context: ITaskContext) => wrapVisualProgress('Collecting win data', async() => {
    // Load options
    const { experimentDirectories, experimentNames } = getExperimentNames(argv);
    const queryRegex = argv.queryRegex ? new RegExp(argv.queryRegex, 'u') : undefined;
    const correctnessReference = argv.correctnessReference ?
      constructCorrectnessChecker(argv.correctnessReference) :
      undefined;
    const markRows: number[] = argv.markRows ?
      argv.markRows.split(',').map((value: string) => Number.parseInt(value, 10)) :
      [];

    // Prepare output CSV file
    const os = fs.createWriteStream(Path.join(context.cwd, `${argv.name}`));
    const serializer = argv.markdown ? new TableSerializerMarkdown(os) : new TableSerializerCsv(os);

    // Collect timings
    const times: Record<string, Record<string, number>> = {};
    const queries: string[] = [];
    const experimentIds: number[] = [];
    for (const [ experimentId, experimentDirectory ] of experimentDirectories.entries()) {
      const results: Record<string, number> = {};
      experimentIds.push(experimentId);
      times[experimentId] = {};

      await handleCsvFile(experimentDirectory, argv, data => {
        if (!queryRegex || queryRegex.test(data.name)) {
          if (experimentId === 0) {
            queries.push(data.name);
          }

          times[experimentId][data.name] = Number.parseInt(data.time, 10);
          results[data.name] = Number.parseInt(data.results, 10);
        }
      });

      // Calculate correctness
      if (correctnessReference) {
        for (const [ query, cardinality ] of Object.entries(results)) {
          if (correctnessReference.getCorrectness(experimentId, query, cardinality) !== 1) {
            times[experimentId][query] = Number.POSITIVE_INFINITY;
          }
        }
      }
    }

    // Calculate wins
    const experimentWins: Record<number, number> = {};
    for (const query of queries) {
      let bestExperiment = -1;
      let lowestTime = Number.POSITIVE_INFINITY;
      for (const experimentId of experimentIds) {
        if (times[experimentId][query] < lowestTime) {
          lowestTime = times[experimentId][query];
          bestExperiment = experimentId;
        }
      }

      if (!(bestExperiment in experimentWins)) {
        experimentWins[bestExperiment] = 0;
      }
      experimentWins[bestExperiment]++;
    }

    // Serialize wins
    serializer.writeHeader([
      '',
      ...experimentNames,
    ], {
      align: [
        'left',
        ...<'right'[]>experimentNames.map(value => 'right'),
      ],
    });
    serializer.writeRow([
      'Wins',
      ...experimentIds.map(experimentId => `${experimentWins[experimentId] || 0}`),
    ]);

    // Close output CSV file
    serializer.close();
  }));
