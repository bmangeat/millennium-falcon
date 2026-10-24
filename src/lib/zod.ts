import type { ZodError } from 'zod';

export interface IssueSummary {
  path: string;
  message: string;
}

export function summarizeIssues(error: ZodError): IssueSummary[] {
  return error.issues.map((issue) => ({
    path: issue.path.map(String).join('.'),
    message: issue.message,
  }));
}

export function formatZodError(error: ZodError): string {
  return summarizeIssues(error)
    .map(({ path, message }) => (path ? `${path}: ${message}` : message))
    .join('; ');
}
