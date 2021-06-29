import * as fs from 'fs';
import Path from 'path';

import parse from 'csv-parse';
import type { Argv } from 'yargs';

import { wrapCommandHandler, wrapVisualProgress } from '../../CliHelpers';

import type { ITaskContext } from '../../ITaskContext';

export const command = 'query <experiment-dir...>';
export const desc = 'Summarize all query execution times from the given experiments';
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
    });
export const handler = (argv: Record<string, any>): Promise<void> => wrapCommandHandler(argv,
  async(context: ITaskContext) => wrapVisualProgress('Summarizing data', async() => {
    // Load options
    const experimentDirectories: string[] = argv.experimentDir;
    const queryRegex = argv.queryRegex ? new RegExp(argv.queryRegex, 'u') : undefined;

    // Prepare output CSV file
    const csvOutputStream = fs.createWriteStream(Path.join(context.cwd, `${argv.name}`));
    csvOutputStream.write(`experiment;time\n`);

    // Read CSV files
    for (const experimentDirectory of experimentDirectories) {
      // Read CSV file
      const csvFile = Path.join(experimentDirectory, argv.inputName);
      await new Promise((resolve, reject) => {
        const parser = parse({ delimiter: argv.inputDelimiter, columns: true });
        parser.on('data', data => {
          if (!queryRegex || queryRegex.test(data.name)) {
            csvOutputStream.write(`${experimentDirectory};${data.time}\n`);
          }
        });
        parser.on('error', reject);
        parser.on('end', resolve);

        fs.createReadStream(csvFile).pipe(parser);
      });
    }

    // Close output CSV file
    csvOutputStream.close();
  }));
