import type { Argv } from 'yargs';

export const command = 'stats';
export const desc = 'Derive statistics from experiments';
export const builder = (yargs: Argv<any>): Argv<any> =>
  yargs
    .commandDir('stats')
    .demandCommand();
