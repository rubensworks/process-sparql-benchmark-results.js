import type * as fs from 'fs';
import type { ITableSerializer } from './ITableSerializer';

export class TableSerializerCsv implements ITableSerializer {
  public constructor(
    public readonly os: fs.WriteStream,
  ) {}

  public writeHeader(columns: string[]): void {
    this.writeRow(columns);
  }

  public writeRow(columns: string[]): void {
    this.os.write(`${columns.join(';')}\n`);
  }

  public close(): void {
    this.os.close();
  }
}
