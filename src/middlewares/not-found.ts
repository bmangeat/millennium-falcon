import type { RequestHandler } from 'express';

import { NotFoundError } from '@/errors.js';

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new NotFoundError('ROUTE_NOT_FOUND', `Cannot ${req.method} ${req.path}`));
};
