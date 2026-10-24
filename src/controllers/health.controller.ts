import type { Request, Response } from 'express';

export function createHealthController(isReady: () => boolean) {
  return {
    live: (_req: Request, res: Response): void => {
      res.json({ status: 'ok' });
    },
    ready: (_req: Request, res: Response): void => {
      if (isReady()) {
        res.json({ status: 'ready' });
        return;
      }
      res.status(503).json({ status: 'unavailable' });
    },
  };
}
