import * as fs from 'fs';
import Path from 'path';
import { Transform } from 'stream';
import { SaxesParser } from '@rubensworks/saxes';
import type { Argv } from 'yargs';
import { wrapCommandHandler, wrapVisualProgress } from '../../CliHelpers';
import type { ITaskContext } from '../../ITaskContext';
import { getExperimentNames } from '../tex/TexUtils';
import { TableSerializerCsv } from './TableSerializerCsv';

export const command = 'bsbm <experiment-dir...>';
export const desc = 'Convert BSBM output files to CSV';
export const USE_CASES = [ 'explore', 'exploreAndUpdate' ];
/**
 * The number of update queries that precede the explore queries in the exploreAndUpdate use case.
 */
export const UPDATE_QUERIES = 2;

/**
 * Determine the name of a query in a BSBM output file.
 * The exploreAndUpdate use case numbers its update queries first,
 * so these are named U1 and U2, and the explore queries keep their own numbers.
 * @param nr The query number in the BSBM output file.
 * @param useCase The BSBM use case.
 */
export function getQueryName(nr: string, useCase: string): string {
  if (useCase !== 'exploreAndUpdate') {
    return nr;
  }
  const number = Number.parseInt(nr, 10);
  return number <= UPDATE_QUERIES ? `U${number}` : String(number - UPDATE_QUERIES);
}

export function builder(yargs: Argv<any>): Argv<any> {
  return yargs
    .options({
      name: {
        type: 'string',
        alias: 'n',
        describe: 'Custom output file name',
        default: 'query-times.csv',
      },
      inputName: {
        type: 'string',
        describe: 'Custom input file name per experiment',
        default: 'bsbm.xml',
      },
      useCase: {
        type: 'string',
        describe: 'The BSBM use case of the experiments, which determines the query names',
        choices: USE_CASES,
        default: 'explore',
      },
    });
}
export function handler(argv: Record<string, any>): Promise<void> {
  return wrapCommandHandler(argv, async(_: ITaskContext) => wrapVisualProgress('Listing data', async() => {
    // Load options
    const { experimentDirectories } = getExperimentNames(argv);

    // Read XML files
    for (const experimentDirectory of experimentDirectories) {
      // Prepare output CSV file
      const os = fs.createWriteStream(Path.join(experimentDirectory, `${argv.name}`));
      const serializer = new TableSerializerCsv(os);
      serializer.writeHeader([
        'name',
        'id',
        'results',
        'time',
      ]);

      // Read XML file
      const xmlFile = Path.join(experimentDirectory, argv.inputName);
      await new Promise<void>((resolve, reject) => {
        const parser = new SaxesParser();
        let query: { name?: string; results?: number; time?: number } | undefined;
        let tagName: string;
        parser.on('opentag', (tag) => {
          if (tag.name === 'query') {
            query = { name: getQueryName(tag.attributes.nr, argv.useCase ?? 'explore') };
          }
          if (query) {
            tagName = tag.name;
          }
        });
        parser.on('text', (text) => {
          if (query && text) {
            if (tagName === 'aqetg' && query.time === undefined) {
              query.time = Number.parseFloat(text) * 1_000;
            } else if (tagName === 'avgresults' && query.results === undefined) {
              query.results = Number.parseFloat(text);
            }
          }
        });
        parser.on('closetag', (tag) => {
          if (tag.name === 'query' && query) {
            serializer.writeRow([
              query.name!,
              '0',
              String(query.results),
              String(query.time),
            ]);
          }
        });
        parser.on('error', reject);

        fs.createReadStream(xmlFile)
          .on('end', resolve)
          .pipe(new Transform({
            objectMode: true,
            transform(chunk: any, encoding: string, callback: (error?: Error | null, data?: any) => void) {
              parser.write(chunk);
              callback();
            },
          }));
      });

      // Close output CSV file
      serializer.close();
    }
  }));
}
