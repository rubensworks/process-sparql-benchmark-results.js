import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

export function runCli(cwd: string, argv: string[]): void {
  const { argv: params } = yargs(hideBin(argv))
    .options({
      verbose: {
        type: 'boolean',
        alias: 'v',
        describe: 'If more logging output should be generated',
      },
    })
    .commandDir('commands')
    .demandCommand()
    .help();
}
