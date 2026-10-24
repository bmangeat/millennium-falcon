import { Router } from 'express';

import { createComputeController } from '@/controllers/compute.controller.js';
import type { RouteFinder } from '@/services/route-finder.service.js';

export function createComputeRouter(routeFinder: RouteFinder): Router {
  const router = Router();
  router.post('/compute', createComputeController(routeFinder));
  return router;
}
