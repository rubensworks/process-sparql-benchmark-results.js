import type { Argv } from 'yargs';

export const command = 'csv';
export const desc = 'Creates CSV files';
export function builder(yargs: Argv<any>): Argv<any> {
  return yargs
    .commandDir('csv')
    .demandCommand();
}
