import type { Argv } from 'yargs';

export const command = 'csv';
export const desc = 'Creates CSV files';
export const builder = (yargs: Argv<any>): Argv<any> =>
  yargs
    .commandDir('csv')
    .demandCommand();
