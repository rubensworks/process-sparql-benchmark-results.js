import * as fs from 'fs';
import * as os from 'os';
import Path from 'path';
import { getQueryName, handler } from '../lib/cli/commands/csv/CommandBsbm';

// Ora is ESM-only, and only renders a spinner
jest.mock<typeof import('ora')>('ora', () => <any> (() => ({ start: () => ({ stop: jest.fn() }) })));

function query(nr: number, aqetg: string, avgresults: string): string {
  return `    <query nr="${nr}">
      <executecount>10</executecount>
      <aqet>0.5</aqet>
      <aqetg>${aqetg}</aqetg>
      <avgresults>${avgresults}</avgresults>
    </query>
`;
}

describe('CommandBsbm', () => {
  describe('getQueryName', () => {
    it('keeps the numbers of the explore use case', () => {
      expect(getQueryName('1', 'explore')).toBe('1');
      expect(getQueryName('14', 'explore')).toBe('14');
    });

    it('names the update queries of the exploreAndUpdate use case', () => {
      expect(getQueryName('1', 'exploreAndUpdate')).toBe('U1');
      expect(getQueryName('2', 'exploreAndUpdate')).toBe('U2');
    });

    it('renumbers the explore queries of the exploreAndUpdate use case', () => {
      expect(getQueryName('3', 'exploreAndUpdate')).toBe('1');
      expect(getQueryName('14', 'exploreAndUpdate')).toBe('12');
    });
  });

  describe('handler', () => {
    let cwd: string;
    let experimentDir: string;

    beforeEach(() => {
      cwd = fs.mkdtempSync(Path.join(os.tmpdir(), 'psbr-bsbm-'));
      experimentDir = Path.join(cwd, 'exp');
      fs.mkdirSync(experimentDir);
      fs.writeFileSync(Path.join(experimentDir, 'bsbm.xml'), `<?xml version="1.0"?><bsbm>
  <queries>
${query(1, '0.002000', '0.00')}${query(2, '0.001500', '0.00')}${query(3, '0.010000', '4.50')}  </queries>
</bsbm>
`);
    });

    afterEach(() => {
      fs.rmSync(cwd, { recursive: true, force: true });
    });

    async function convert(useCase?: string): Promise<string> {
      await handler({
        cwd,
        experimentDir: [ experimentDir ],
        name: 'query-times.csv',
        inputName: 'bsbm.xml',
        useCase,
      });
      return fs.readFileSync(Path.join(experimentDir, 'query-times.csv'), 'utf8');
    }

    it('converts the explore use case', async() => {
      await expect(convert('explore')).resolves.toBe(`name;id;results;time
1;0;0;2
2;0;0;1.5
3;0;4.5;10
`);
    });

    it('converts the explore use case by default', async() => {
      await expect(convert()).resolves.toBe(`name;id;results;time
1;0;0;2
2;0;0;1.5
3;0;4.5;10
`);
    });

    it('converts the exploreAndUpdate use case', async() => {
      await expect(convert('exploreAndUpdate')).resolves.toBe(`name;id;results;time
U1;0;0;2
U2;0;0;1.5
1;0;4.5;10
`);
    });
  });
});
