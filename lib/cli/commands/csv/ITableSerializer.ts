export interface ITableSerializer {
  writeHeader: (columns: string[]) => void;
  writeRow: (columns: string[]) => void;
  close: () => void;
}
