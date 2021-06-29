import type { Logger } from 'winston';
/**
 * Common data when running a task.
 */
export interface ITaskContext {
  cwd: string;
  verbose: boolean;
  logger: Logger;
  templatesRoot: string;
}
