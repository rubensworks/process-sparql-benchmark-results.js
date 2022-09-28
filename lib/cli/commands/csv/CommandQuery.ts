import * as fs from 'fs';
import Path from 'path';

import parse from 'csv-parse';
import type { Argv } from 'yargs';

import { constructCorrectnessChecker } from '../../../correctness/CorrectnessCheckerUtils';
import { wrapCommandHandler, wrapVisualProgress } from '../../CliHelpers';

import type { ITaskContext } from '../../ITaskContext';
import { getExperimentNames } from '../tex/TexUtils';
import { TableSerializerCsv } from './TableSerializerCsv';
import { TableSerializerMarkdown } from './TableSerializerMarkdown';

export const command = 'query <experiment-dir...>';
export const desc = 'List all query execution times from the given experiments';
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
        default: 'data_all.csv',
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
    });
export const handler = (argv: Record<string, any>): Promise<void> => wrapCommandHandler(argv,
  async(context: ITaskContext) => wrapVisualProgress('Listing data', async() => {
    // Load options
    const { experimentDirectories, experimentNames } = getExperimentNames(argv);
    const queryRegex = argv.queryRegex ? new RegExp(argv.queryRegex, 'u') : undefined;
    const correctnessReference = argv.correctnessReference ?
      constructCorrectnessChecker(argv.correctnessReference) :
      undefined;

    // Prepare output CSV file
    const os = fs.createWriteStream(Path.join(context.cwd, `${argv.name}`));
    const serializer = argv.markdown ? new TableSerializerMarkdown(os) : new TableSerializerCsv(os);
    serializer.writeHeader([
      'experiment',
      'time',
      'requests',
      'results',
      ...correctnessReference ? [ 'correctness' ] : [],
    ]);

    // Read CSV files
    for (const [ experimentId, experimentDirectory ] of experimentDirectories.entries()) {
      // Read CSV file
      const csvFile = Path.join(experimentDirectory, argv.inputName);
      await new Promise((resolve, reject) => {
        const parser = parse({ delimiter: argv.inputDelimiter, columns: true });
        parser.on('data', data => {
          if (!queryRegex || queryRegex.test(data.name)) {
            serializer.writeRow([
              experimentNames[experimentId],
              data.time,
              data.httpRequests || '0',
              data.results,
              ...correctnessReference ?
                [ correctnessReference.getCorrectness(experimentId, data.name, Number.parseInt(data.results, 10)) ] :
                [],
            ]);
          }
        });
        parser.on('error', reject);
        parser.on('end', resolve);

        fs.createReadStream(csvFile).pipe(parser);
      });
    }

    // Close output CSV file
    serializer.close();
  }));
