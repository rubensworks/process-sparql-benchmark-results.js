import type { Argv } from 'yargs';

export const command = 'stats';
export const desc = 'Derive statistics from experiments';
export function builder(yargs: Argv<any>): Argv<any> {
  return yargs
    .commandDir('stats')
    .demandCommand();
}
