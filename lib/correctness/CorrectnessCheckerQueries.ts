import type { ICorrectnessChecker } from './ICorrectnessChecker';

export class CorrectnessCheckerQueries implements ICorrectnessChecker {
  public constructor(
    private readonly expectedCardinality: Record<string, number>,
  ) {}

  public getCorrectness(experimentId: number, query: string, actualCardinality: number): number {
    return actualCardinality / this.expectedCardinality[query];
  }
}
