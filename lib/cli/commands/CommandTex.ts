import type { Argv } from 'yargs';

export const command = 'tex';
export const desc = 'Creates a LaTeX TikZ plot file';
export const builder = (yargs: Argv<any>): Argv<any> =>
  yargs
    .commandDir('tex')
    .demandCommand();
