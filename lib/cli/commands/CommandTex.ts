import type { Argv } from 'yargs';

export const command = 'tex';
export const desc = 'Creates a LaTeX TikZ plot file';
export function builder(yargs: Argv<any>): Argv<any> {
  return yargs
    .commandDir('tex')
    .demandCommand();
}
