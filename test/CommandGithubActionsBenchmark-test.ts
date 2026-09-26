import * as fs from 'fs';
import * as os from 'os';
import Path from 'path';
import { handler } from '../lib/cli/commands/csv/CommandGithubActionsBenchmark';

// Ora is ESM-only, and only renders a spinner
jest.mock<typeof import('ora')>('ora', () => <any> (() => ({ start: () => ({ stop: jest.fn() }) })));

const HEADER = 'name;id;error;results;httpRequests;time';

describe('CommandGithubActionsBenchmark', () => {
  let cwd: string;

  beforeEach(() => {
    cwd = fs.mkdtempSync(Path.join(os.tmpdir(), 'psbr-ghbench-'));
  });

  afterEach(() => {
    fs.rmSync(cwd, { recursive: true, force: true });
  });

  async function run(rows: string[], options: Record<string, any>): Promise<any[]> {
    const experimentDir = Path.join(cwd, 'exp');
    fs.mkdirSync(experimentDir);
    fs.writeFileSync(Path.join(experimentDir, 'query-times.csv'), [ HEADER, ...rows ].join('\n'));
    await handler({
      cwd,
      experimentDir: [ experimentDir ],
      name: 'ghbench.json',
      inputName: 'query-times.csv',
      inputDelimiter: ';',
      overrideCombinationLabels: 'E',
      total: false,
      detailed: true,
      ...options,
    });
    return JSON.parse(fs.readFileSync(Path.join(cwd, 'ghbench.json'), 'utf8'));
  }

  const rows = [
    'ok;0;false;1;0;100',
    'ok;1;false;1;0;300',
    'partial;0;true;0;0;0',
    'partial;1;false;1;0;50',
    'failed;0;true;0;0;0',
    'failed;1;true;0;0;0',
  ];

  it('omits queries that failed for all instantiations', async() => {
    const output = await run(rows, {});
    expect(output.map(entry => [ entry.name, entry.value ])).toEqual([
      [ 'E - ok', 300 ],
      [ 'E - partial', 50 ],
    ]);
  });

  it('reports failed query instantiations', async() => {
    const output = await run(rows, { detailed: false, failures: true });
    expect(output).toEqual([{
      name: 'E - failed queries',
      unit: 'failed instantiations',
      value: 3,
      extra: 'partial: 1/2 failed; failed: 2/2 failed',
    }]);
  });

  it('reports no failed query instantiations', async() => {
    const output = await run([ 'ok;0;false;1;0;100' ], { detailed: false, failures: true });
    expect(output).toEqual([{ name: 'E - failed queries', unit: 'failed instantiations', value: 0, extra: 'None' }]);
  });

  it('does not report failures by default', async() => {
    const output = await run(rows, { detailed: false });
    expect(output).toEqual([]);
  });

  it('excludes failed queries from the total', async() => {
    const output = await run(rows, { total: true, detailed: false });
    expect(output).toEqual([{ name: 'E', unit: 'ms', value: 350 }]);
  });
});
