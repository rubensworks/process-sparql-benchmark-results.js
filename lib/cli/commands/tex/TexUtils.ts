import fs from 'fs';
import Path from 'path';
import * as spawn from 'cross-spawn';
import parse from 'csv-parse';
import { ErrorHandled } from '../../ErrorHandled';
import type { ITaskContext } from '../../ITaskContext';

/**
 * Determine experiment labels
 * @param argv CLI args
 */
export function getExperimentNames(argv: Record<string, any>): {
  experimentDirectories: string[];
  experimentNames: string[];
  experimentIds: number[];
} {
  const experimentDirectories: string[] = argv.experimentDir;
  let experimentNames = experimentDirectories.map(dir => {
    const lastSlash = dir.lastIndexOf(Path.sep);
    if (lastSlash >= 0) {
      return dir.slice(lastSlash + 1);
    }
    return dir;
  });

  if (argv.overrideCombinationLabels) {
    const overrideCombinationLabels = argv.overrideCombinationLabels.split(',');
    if (overrideCombinationLabels.length !== experimentNames.length) {
      throw new Error(`Invalid combination labels override, expected ${experimentNames.length} labels while ${overrideCombinationLabels.length} where given`);
    }
    experimentNames = overrideCombinationLabels;
  }

  const experimentIds = experimentNames.map((name, id) => id);

  return {
    experimentDirectories,
    experimentNames,
    experimentIds,
  };
}

/**
 * Read a CSV file and handle each row.
 * @param experimentDirectory An experiment directory.
 * @param argv CLI args
 * @param handler A callback for each row.
 */
export async function handleCsvFile(
  experimentDirectory: string,
  argv: Record<string, any>,
  handler: (data: any) => void,
): Promise<void> {
  const csvFile = Path.join(experimentDirectory, argv.inputName);
  await new Promise((resolve, reject) => {
    const parser = parse({ delimiter: argv.inputDelimiter, columns: true });
    parser.on('data', handler);
    parser.on('error', reject);
    parser.on('end', resolve);

    fs.createReadStream(csvFile).pipe(parser);
  });
}

/**
 * Determine the color scheme.
 * @param argv CLI args
 * @param experimentDirectories The array of experiment directories.
 */
export function getColorScheme(argv: Record<string, any>, experimentDirectories: string[]): string {
  let colorScheme: string;
  if (argv.color) {
    colorScheme = argv.color;
  } else {
    // We only allow even indexes, as uneven spectral schemes have a yellow tint that is hard to read on screens
    const colorSchemeIndex = (Math.round(experimentDirectories.length + 2 - 1) / 2) * 2;
    colorScheme = `Spectral-${colorSchemeIndex}`;
  }
  return colorScheme;
}

/**
 * Create an SVG file from a TeX file by invoking 'tex2svg'.
 * @param argv CLI args
 * @param context The task context.
 */
export async function toSvg(argv: Record<string, any>, context: ITaskContext): Promise<void> {
  const { error, status, stdout, stderr } = spawn.sync('tex2svg', [ `${argv.name}.tex` ], {
    stdio: 'pipe',
    encoding: 'utf8',
    cwd: context.cwd,
  });
  if (error) {
    throw error;
  }
  if (status !== 0) {
    throw new ErrorHandled(`tex2svg failed}:\n${stdout + stderr}`);
  }
}
