import type fs from 'fs';
import type { ITableSerializer } from './ITableSerializer';

export class TableSerializerMarkdown implements ITableSerializer {
  protected headerColumns = 1;

  public constructor(
    public readonly os: fs.WriteStream,
  ) {}

  public writeHeader(columns: string[]): void {
    this.writeRow(columns);
    this.writeLine(columns.length);
    this.headerColumns = columns.length;
  }

  public writeRow(columns: string[]): void {
    this.os.write(`| ${columns.join(' | ')} |\n`);
  }

  protected writeLine(columns: number): void {
    this.os.write(`|${' --- |'.repeat(columns)}\n`);
  }

  public close(): void {
    this.os.close();
  }
}
