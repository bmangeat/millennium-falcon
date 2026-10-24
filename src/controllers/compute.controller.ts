import type { Request, Response } from 'express';

import { NotFoundError } from '../errors.js';
import { computeRequestSchema } from '../schemas/compute.schema.js';
import type { RouteFinder } from '../services/route-finder.service.js';

export function createComputeController(routeFinder: RouteFinder) {
  return (req: Request, res: Response): void => {
    // A ZodError thrown here is translated to a 400 by the error handler.
    const { arrival } = computeRequestSchema.parse(req.body);

    const result = routeFinder.findFastestRoute(arrival);
    if (result === null) {
      throw new NotFoundError('NO_ROUTE_FOUND', `No route found to "${arrival}"`);
    }
    res.json(result);
  };
}
