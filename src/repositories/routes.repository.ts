import { existsSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

import { z } from 'zod';

import type { Route } from '../domain/route.js';
import { ConfigError } from '../errors.js';
import { formatZodError } from '../lib/zod.js';

export interface RoutesRepository {
  findAll(): Route[];
  /** Cheap liveness probe of the underlying data source. */
  isHealthy(): boolean;
  close(): void;
}

const routeRowSchema = z.object({
  ORIGIN: z.string().min(1),
  DESTINATION: z.string().min(1),
  TRAVEL_TIME: z.number().int().positive(),
});

/**
 * Read-only access to the SQLite `ROUTES` table.
 * Uses the built-in `node:sqlite` module: no native dependency to compile in the Docker image.
 */
export class SqliteRoutesRepository implements RoutesRepository {
  private readonly db: DatabaseSync;

  constructor(dbPath: string) {
    if (!existsSync(dbPath)) {
      throw new ConfigError(`Routes database not found at ${dbPath}`);
    }
    try {
      this.db = new DatabaseSync(dbPath, { readOnly: true });
    } catch (cause) {
      throw new ConfigError(`Cannot open routes database at ${dbPath}`, { cause });
    }
  }

  findAll(): Route[] {
    let rows: unknown[];
    try {
      rows = this.db
        .prepare(
          'SELECT origin as ORIGIN, destination as DESTINATION, travel_time as TRAVEL_TIME FROM ROUTES',
        )
        .all();
    } catch (cause) {
      throw new ConfigError('Cannot read the ROUTES table', { cause });
    }

    const result = z.array(routeRowSchema).safeParse(rows);
    if (!result.success) {
      throw new ConfigError(`Invalid data in ROUTES table: ${formatZodError(result.error)}`);
    }
    return result.data.map((row) => ({
      origin: row.ORIGIN,
      destination: row.DESTINATION,
      travelTime: row.TRAVEL_TIME,
    }));
  }

  isHealthy(): boolean {
    try {
      this.db.prepare('SELECT 1').get();
      return true;
    } catch {
      return false;
    }
  }

  close(): void {
    this.db.close();
  }
}
