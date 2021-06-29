import * as fs from 'fs';
import Path from 'path';
import * as spawn from 'cross-spawn';
import parse from 'csv-parse';
import type { Argv } from 'yargs';
import { instantiateTemplate } from '../../../TemplateUtils';
import { wrapCommandHandler, wrapVisualProgress } from '../../CliHelpers';
import { ErrorHandled } from '../../ErrorHandled';
import type { ITaskContext } from '../../ITaskContext';

export const command = 'query <experiment-dir...>';
export const desc = 'Plot the query execution times from the given experiments';
export const builder = (yargs: Argv<any>): Argv<any> =>
  yargs
    .options({
      queryRegex: {
        type: 'string',
        alias: 'q',
        describe: 'Regex for queries to include (before any label overrides). Examples: \'^C\', \'^[^C]\', ...',
      },
      name: {
        type: 'string',
        alias: 'n',
        describe: 'Custom output file name',
        default: 'plot_queries_data',
      },
      color: {
        type: 'string',
        alias: 'c',
        describe: 'Color scheme name from colorbrewer2.org',
      },
      maxY: {
        type: 'number',
        describe: 'The upper limit of the Y-axis. Defaults to maximum Y value',
      },
      legend: {
        type: 'boolean',
        describe: 'If a legend should be included',
        default: true,
      },
      legendPos: {
        type: 'string',
        describe: 'The legend position X,Y (anchor north-east)',
        default: '1.0,1.0',
      },
      logY: {
        type: 'boolean',
        describe: 'If the Y-Axis must have a log scale',
        default: false,
      },
      inputName: {
        type: 'string',
        describe: 'Custom input file name per experiment',
        default: 'query-times.csv',
      },
      inputDelimiter: {
        type: 'string',
        describe: 'Delimiter for the input CSV file',
        default: ';',
      },
      overrideCombinationLabels: {
        type: 'string',
        describe: 'Comma-separated list of combination labels to use',
      },
      overrideQueryLabels: {
        type: 'string',
        describe: 'Comma-separated list of query labels to use',
      },
      svg: {
        type: 'boolean',
        describe: 'If the tex file should be converted to svg via the tex2svg command',
        default: false,
      },
    });
export const handler = (argv: Record<string, any>): Promise<void> => wrapCommandHandler(argv,
  async(context: ITaskContext) => wrapVisualProgress('Plotting data', async() => {
    // Determine experiment labels
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

    // Determine query regex
    const queryRegex = argv.queryRegex ? new RegExp(argv.queryRegex, 'u') : undefined;

    // Prepare query CSV file with averages per query group
    let queryNames: string[] | undefined;
    const outputCsvEntries: Record<string, number[]> = {};
    for (const experimentDirectory of experimentDirectories) {
      // Read CSV file
      const csvFile = Path.join(experimentDirectory, argv.inputName);
      const totals: Record<string, number[]> = {};
      await new Promise((resolve, reject) => {
        const parser = parse({ delimiter: argv.inputDelimiter, columns: true });
        parser.on('data', data => {
          if (!queryRegex || queryRegex.test(data.name)) {
            if (!(data.name in totals)) {
              totals[data.name] = [];
            }
            totals[data.name].push(Number.parseInt(data.time, 10));
          }
        });
        parser.on('error', reject);
        parser.on('end', resolve);

        fs.createReadStream(csvFile).pipe(parser);
      });

      // Calculate average
      const averages: Record<string, number> = {};
      for (const [ query, times ] of Object.entries(totals)) {
        const average = times.reduce((sum, current) => sum + current) / times.length;
        averages[query] = average;
      }

      // Set query names and count
      if (!queryNames) {
        queryNames = Object.keys(averages);
        for (const queryName of queryNames) {
          outputCsvEntries[queryName] = [];
        }
      } else if (queryNames.join(',') !== Object.keys(averages).join(',')) {
        throw new Error(`Tried to plot experiments with different query sets`);
      }

      // Append averaged result
      for (const queryName of queryNames) {
        outputCsvEntries[queryName].push(averages[queryName]);
      }
    }
    if (!queryNames) {
      throw new Error(`No queries could be found`);
    }
    // Determine query labels
    if (argv.overrideQueryLabels) {
      const overrideQueryLabels: string[] = argv.overrideQueryLabels.split(',');
      if (overrideQueryLabels.length !== queryNames.length) {
        throw new Error(`Invalid query labels override, expected ${queryNames.length} labels while ${overrideQueryLabels.length} where given`);
      }
      // Relabel outputCsvEntries entries
      for (const [ i, queryName ] of queryNames.entries()) {
        const averages = outputCsvEntries[queryName];
        delete outputCsvEntries[queryName];
        outputCsvEntries[overrideQueryLabels[i]] = averages;
      }
      queryNames = overrideQueryLabels;
    }

    // Write output CSV file
    const csvOutputStream = fs.createWriteStream(Path.join(context.cwd, `${argv.name}.csv`));
    csvOutputStream.write(`query;${experimentIds.join(';')}\n`);
    for (const [ key, columns ] of Object.entries(outputCsvEntries)) {
      csvOutputStream.write(`${key};${columns.join(';')}\n`);
    }
    csvOutputStream.close();

    // Prepare color scheme
    let colorScheme: string;
    if (argv.color) {
      colorScheme = argv.color;
    } else {
      // We only allow even indexes, as uneven spectral schemes have a yellow tint that is hard to read on screens
      const colorSchemeIndex = (Math.round(experimentDirectories.length + 2 - 1) / 2) * 2;
      colorScheme = `Spectral-${colorSchemeIndex}`;
    }

    // Prepare bar lines
    const barLines = experimentNames
      .map((name, id) => `\\addplot+[ybar] table [x=query, y expr=\\thisrow{${id}} / 1000, col sep=semicolon]{"${argv.name}.csv"};`)
      .join('\n');

    // Instantiate template
    await instantiateTemplate(
      Path.join(context.templatesRoot, 'tex', 'plot_query_data.tex'),
      Path.join(context.cwd, `${argv.name}.tex`),
      {
        X_LIMITS: experimentDirectories.length * 2,
        WIDTH: queryNames.length * 20,
        QUERIES: queryNames.join(','),
        LEGEND: experimentNames.map(name => name.replace(/_/gu, '\\_')).join(','),
        BARS: barLines,
        COLOR_SCHEME: colorScheme,
        LEGEND_POS: argv.legendPos,
        ...argv.maxY ? { Y_MAX: `ymax=${argv.maxY},` } : {},
      },
      contents => {
        if (!argv.legend) {
          contents = contents.replace(/^\\legend.*$/u, '');
        }
        if (argv.logY) {
          contents = contents.replace(/^ymin=0,$/u, 'ymode=log,log origin=infty,');
        }
        return contents;
      },
    );

    // Render CSV from TeX
    if (argv.svg) {
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
  }));
