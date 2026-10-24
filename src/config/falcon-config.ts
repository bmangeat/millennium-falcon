import { readFileSync } from 'node:fs';
import path from 'node:path';

import { z } from 'zod';

import { ConfigError } from '@/errors.js';
import { formatZodError } from '@/lib/zod.js';

const falconConfigFileSchema = z.object({
  autonomy: z.number().int().positive(),
  departure: z.string().trim().min(1),
  routes_db: z.string().min(1),
});

export interface FalconConfig {
  /** Number of days of travel the Falcon can do before it must refuel. */
  autonomy: number;
  /** Planet where the Falcon is parked on day 0. */
  departure: string;
  /** Absolute path of the SQLite routes database. */
  routesDbPath: string;
}

/**
 * Reads and validates `millennium-falcon.json`.
 * `routes_db` may be absolute, or relative to the directory containing the config file.
 */
export function loadFalconConfig(configPath: string): FalconConfig {
  const absoluteConfigPath = path.resolve(configPath);

  let raw: string;
  try {
    raw = readFileSync(absoluteConfigPath, 'utf8');
  } catch (cause) {
    throw new ConfigError(`Cannot read Falcon config file at ${absoluteConfigPath}`, { cause });
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (cause) {
    throw new ConfigError(`Falcon config file ${absoluteConfigPath} is not valid JSON`, { cause });
  }

  const result = falconConfigFileSchema.safeParse(json);
  if (!result.success) {
    throw new ConfigError(
      `Invalid Falcon config file ${absoluteConfigPath}: ${formatZodError(result.error)}`,
    );
  }

  const { autonomy, departure, routes_db } = result.data;
  return {
    autonomy,
    departure,
    routesDbPath: path.resolve(path.dirname(absoluteConfigPath), routes_db),
  };
}
