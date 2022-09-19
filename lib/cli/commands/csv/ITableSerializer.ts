export interface ITableSerializer {
  writeHeader: (columns: string[], options?: { align?: ('left' | 'right')[] }) => void;
  writeRow: (columns: string[]) => void;
  close: () => void;
}
