import { randomUUID } from 'node:crypto';

import cors from 'cors';
import express, { type Express } from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import type { Logger } from 'pino';
import { pinoHttp } from 'pino-http';

import type { Env } from './config/env.js';
import { errorHandler } from './middlewares/error-handler.js';
import { notFoundHandler } from './middlewares/not-found.js';
import { createComputeRouter } from './routes/compute.routes.js';
import { createHealthRouter } from './routes/health.routes.js';
import type { RouteFinder } from './services/route-finder.service.js';

export interface AppDependencies {
  env: Env;
  logger: Logger;
  routeFinder: RouteFinder;
  /** Readiness probe (e.g. is the database reachable?). */
  isReady: () => boolean;
}

const REQUEST_ID_PATTERN = /^[\w.-]{1,128}$/;
const OPERATIONAL_PATHS = ['/health'];

/** Builds the Express app. No I/O happens here, which keeps it trivially testable. */
export function createApp({ env, logger, routeFinder, isReady }: AppDependencies): Express {
  const app = express();
  app.disable('x-powered-by');

  app.use(
    pinoHttp({
      logger,
      autoLogging: {
        ignore: (req) => OPERATIONAL_PATHS.some((path) => req.url.startsWith(path)),
      },
      genReqId: (req, res) => {
        const incoming = req.headers['x-request-id'];
        const id =
          typeof incoming === 'string' && REQUEST_ID_PATTERN.test(incoming)
            ? incoming
            : randomUUID();
        res.setHeader('x-request-id', id);
        return id;
      },
    }),
  );
  app.use(helmet());

  // Operational endpoints are mounted before CORS and rate limiting (probes, scrapers).
  app.use(createHealthRouter(isReady));

  if (env.corsOrigins.length > 0) {
    app.use(cors({ origin: env.corsOrigins, methods: ['GET', 'POST'] }));
  }
  app.use(
    rateLimit({
      windowMs: env.rateLimit.windowMs,
      limit: env.rateLimit.max,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: { error: { code: 'RATE_LIMITED', message: 'Too many requests' } },
    }),
  );
  app.use(express.json({ limit: '10kb' }));

  app.use(createComputeRouter(routeFinder));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
