import type fs from 'fs';
import type { ITableSerializer } from './ITableSerializer';

export class TableSerializerMarkdown implements ITableSerializer {
  protected headerColumns = 1;

  public constructor(
    public readonly os: fs.WriteStream,
  ) {}

  public writeHeader(columns: string[], options?: { align?: ('left' | 'right')[] }): void {
    this.writeRow(columns);
    this.writeLine(columns.length, options);
    this.headerColumns = columns.length;
  }

  public writeRow(columns: string[], options?: { mark?: boolean }): void {
    if (options?.mark) {
      columns = columns.map(value => `**${value}**`);
    }
    this.os.write(`| ${columns.join(' | ')} |\n`);
  }

  protected writeLine(columns: number, options?: { align?: ('left' | 'right')[] }): void {
    let sb = '|';
    for (let i = 0; i < columns; i++) {
      const alignRight = options?.align ? options.align[i] === 'right' : 'false';
      sb += ` ---${alignRight ? ':' : ''} |`;
    }
    sb += '\n';

    this.os.write(sb);
  }

  public close(): void {
    this.os.close();
  }
}
