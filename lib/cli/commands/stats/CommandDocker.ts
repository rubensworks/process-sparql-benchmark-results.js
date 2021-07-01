import * as fs from 'fs';
import Path from 'path';

import parse from 'csv-parse';
import type { Argv } from 'yargs';

import { wrapCommandHandler } from '../../CliHelpers';

import type { ITaskContext } from '../../ITaskContext';

export const command = 'docker <docker-csv-file>';
export const desc = 'Show the stats of an Docker CSV file from an experiment';
export const builder = (yargs: Argv<any>): Argv<any> =>
  yargs
    .options({
      digits: {
        type: 'number',
        alias: 'd',
        describe: 'The precision of output numbers',
        default: 2,
      },
    });
export const handler = (argv: Record<string, any>): Promise<void> => wrapCommandHandler(argv,
  async(context: ITaskContext) => {
    // Load options
    const file: string = argv.dockerCsvFile;
    const digits: number = argv.digits;

    // Read CSV file
    const csvFile = Path.join(context.cwd, file);
    const entries: Record<string, number[]> = {};
    await new Promise((resolve, reject) => {
      const parser = parse({ delimiter: argv.inputDelimiter, columns: true });
      parser.on('data', (data: Record<string, string>) => {
        for (const [ key, value ] of Object.entries(data)) {
          if (!(key in entries)) {
            entries[key] = [];
          }
          entries[key].push(Number.parseFloat(value));
        }
      });
      parser.on('error', reject);
      parser.on('end', resolve);

      fs.createReadStream(csvFile).pipe(parser);
    });

    // Calculate stats
    context.logger.info(`CPU: ${average(entries.cpu_percentage).toFixed(digits)} %`);
    context.logger.info(`Memory relative: ${(average(entries.memory) / 1_024 / 1_024).toFixed(digits)} MB`);
    context.logger.info(`Memory absolute: ${average(entries.memory_percentage).toFixed(digits)} %`);
    context.logger.info(`Received: ${(last(entries.received) / 1_024 / 1_024).toFixed(digits)} MB`);
    context.logger.info(`Transmitted: ${(last(entries.transmitted) / 1_024 / 1_024).toFixed(digits)} MB`);
  });

export function average(values: number[]): number {
  return values.reduce((sum, current) => sum + current) / values.length;
}

export function last(values: number[]): number {
  return values[values.length - 1];
}
