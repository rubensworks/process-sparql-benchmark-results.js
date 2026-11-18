import * as fs from 'fs';
import * as os from 'os';
import Path from 'path';
import { handler } from '../lib/cli/commands/tex/CommandQuery';

// Ora is ESM-only, and only renders a spinner
jest.mock<typeof import('ora')>('ora', () => <any> (() => ({ start: () => ({ stop: jest.fn() }) })));

const HEADER = 'name;id;error;results;httpRequests;time';

describe('CommandQuery', () => {
  let cwd: string;

  beforeEach(() => {
    cwd = fs.mkdtempSync(Path.join(os.tmpdir(), 'psbr-query-'));
  });

  afterEach(() => {
    fs.rmSync(cwd, { recursive: true, force: true });
  });

  // Plots the given rows of query-times.csv, and returns the plotted mean, minus and plus per query.
  async function plot(rows: string[]): Promise<Record<string, number[]>> {
    const experimentDir = Path.join(cwd, 'exp');
    fs.mkdirSync(experimentDir);
    fs.writeFileSync(Path.join(experimentDir, 'query-times.csv'), [ HEADER, ...rows ].join('\n'));
    await handler({
      cwd,
      experimentDir: [ experimentDir ],
      name: 'plot',
      inputName: 'query-times.csv',
      inputDelimiter: ';',
      overrideCombinationLabels: 'E',
      shiftColorList: 0,
      legend: true,
      legendPos: '1.0,1.0',
      logY: false,
      zeroReplacement: 0,
      svg: false,
      metric: 'time',
      outliers: true,
      relative: false,
    });
    const [ , ...lines ] = fs.readFileSync(Path.join(cwd, 'plot.csv'), 'utf8').trim().split('\n');
    return Object.fromEntries(lines.map((line) => {
      const [ query, mean, minus, plus ] = line.split(';');
      return [ query, [ mean, minus, plus ].map(Number) ];
    }));
  }

  it('leaves failed query instantiations out of the averages', async() => {
    const output = await plot([
      'ok;0;false;1;0;100',
      'ok;1;false;1;0;300',
      'partial;0;true;0;0;0',
      'partial;1;false;1;0;50',
    ]);
    expect(output.ok).toEqual([ 200, 100, 100 ]);
    expect(output.partial).toEqual([ 50, 0, 0 ]);
  });

  it('has no values for queries that failed for all instantiations', async() => {
    const output = await plot([
      'ok;0;false;1;0;100',
      'failed;0;true;0;0;0',
      'failed;1;true;0;0;0',
    ]);
    expect(output.ok).toEqual([ 100, 0, 0 ]);
    expect(output.failed).toEqual([ Number.NaN, Number.NaN, Number.NaN ]);
  });
});
