import { pino, type Logger, type LoggerOptions } from 'pino';

import type { Env } from '../config/env.js';

export function createLogger(env: Pick<Env, 'logLevel' | 'nodeEnv'>): Logger {
  const options: LoggerOptions = {
    level: env.logLevel,
    redact: {
      paths: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
      censor: '[redacted]',
    },
  };
  if (env.nodeEnv === 'development') {
    options.transport = { target: 'pino-pretty' };
  }
  return pino(options);
}
