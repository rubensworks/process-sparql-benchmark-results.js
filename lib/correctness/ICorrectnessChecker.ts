export interface ICorrectnessChecker {
  getCorrectness: (experimentId: number, query: string, actualCardinality: number) => number;
}
