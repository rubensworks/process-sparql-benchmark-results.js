export interface ITableSerializer {
  writeHeader: (columns: string[], options?: { align?: ('left' | 'right')[] }) => void;
  writeRow: (columns: string[], options?: { mark?: boolean }) => void;
  close: () => void;
}
