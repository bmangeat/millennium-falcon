import { Router } from 'express';

import { createHealthController } from '../controllers/health.controller.js';

export function createHealthRouter(isReady: () => boolean): Router {
  const controller = createHealthController(isReady);
  const router = Router();
  router.get('/health/live', controller.live);
  router.get('/health/ready', controller.ready);
  return router;
}
