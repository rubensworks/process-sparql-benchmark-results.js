import { readFileSync } from 'fs';
import { CorrectnessCheckerQueries } from './CorrectnessCheckerQueries';
import type { ICorrectnessChecker } from './ICorrectnessChecker';

export function constructCorrectnessChecker(correctnessReference: string): ICorrectnessChecker {
  const data = JSON.parse(readFileSync(correctnessReference, 'utf8'));
  if (data.type === 'queries') {
    return new CorrectnessCheckerQueries(data.queries);
  }
  throw new Error(`Unsupported correctness reference with type '${data.type}'`);
}
