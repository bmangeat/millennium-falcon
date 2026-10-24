import type { ErrorRequestHandler, Response } from 'express';
import { ZodError } from 'zod';

import { AppError } from '../errors.js';
import { summarizeIssues } from '../lib/zod.js';

function sendError(
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: unknown,
): void {
  res
    .status(status)
    .json({ error: { code, message, ...(details === undefined ? {} : { details }) } });
}

/** Extracts the status of 4xx errors raised by Express/body-parser (malformed JSON, too large...). */
function getClientErrorStatus(err: unknown): number | undefined {
  if (
    typeof err === 'object' &&
    err !== null &&
    'statusCode' in err &&
    typeof err.statusCode === 'number' &&
    err.statusCode >= 400 &&
    err.statusCode < 500
  ) {
    return err.statusCode;
  }
  return undefined;
}

/** Single place where errors become HTTP responses. Never leaks internals on 5xx. */
export const errorHandler: ErrorRequestHandler = (err: unknown, req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  if (err instanceof ZodError) {
    sendError(res, 400, 'VALIDATION_ERROR', 'Invalid request', summarizeIssues(err));
    return;
  }

  if (err instanceof AppError) {
    sendError(res, err.statusCode, err.code, err.message, err.details);
    return;
  }

  const clientStatus = getClientErrorStatus(err);
  if (clientStatus !== undefined) {
    const tooLarge = clientStatus === 413;
    sendError(
      res,
      clientStatus,
      tooLarge ? 'PAYLOAD_TOO_LARGE' : 'BAD_REQUEST',
      tooLarge ? 'Payload too large' : 'Malformed request',
    );
    return;
  }

  req.log.error({ err }, 'Unhandled error');
  sendError(res, 500, 'INTERNAL_ERROR', 'Internal server error');
};
