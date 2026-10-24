import { createApp } from './app.js';
import { loadEnv } from './config/env.js';
import { loadFalconConfig } from './config/falcon-config.js';
import { createLogger } from './lib/logger.js';
import { SqliteRoutesRepository } from './repositories/routes.repository.js';
import { RouteFinderService } from './services/route-finder.service.js';

const SHUTDOWN_TIMEOUT_MS = 10_000;

/** Composition root: the only place where concrete implementations are wired together. */
function main(): void {
  const env = loadEnv();
  const logger = createLogger(env);

  const falconConfig = loadFalconConfig(env.falconConfigPath);
  const repository = new SqliteRoutesRepository(falconConfig.routesDbPath);
  const routes = repository.findAll();
  logger.info(
    { routes: routes.length, departure: falconConfig.departure, autonomy: falconConfig.autonomy },
    'Universe loaded',
  );

  const routeFinder = new RouteFinderService(routes, {
    autonomy: falconConfig.autonomy,
    departure: falconConfig.departure,
  });
  const app = createApp({ env, logger, routeFinder, isReady: () => repository.isHealthy() });

  const server = app.listen(env.port, env.host, () => {
    logger.info({ host: env.host, port: env.port }, 'Server listening');
  });

  let shuttingDown = false;
  const shutdown = (reason: string, exitCode = 0): void => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ reason }, 'Shutting down');
    setTimeout(() => {
      logger.error('Graceful shutdown timed out, forcing exit');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS).unref();
    server.close((error) => {
      repository.close();
      process.exit(error ? 1 : exitCode);
    });
    server.closeIdleConnections();
  };

  process.on('SIGTERM', () => {
    shutdown('SIGTERM');
  });
  process.on('SIGINT', () => {
    shutdown('SIGINT');
  });
  process.on('unhandledRejection', (reason) => {
    logger.fatal({ err: reason }, 'Unhandled promise rejection');
    shutdown('unhandledRejection', 1);
  });
  process.on('uncaughtException', (error) => {
    logger.fatal({ err: error }, 'Uncaught exception');
    shutdown('uncaughtException', 1);
  });
}

try {
  main();
} catch (error) {
  // The logger may not exist yet (invalid env), so fall back to stderr.
  console.error(error instanceof Error ? (error.stack ?? error.message) : error);
  process.exit(1);
}
