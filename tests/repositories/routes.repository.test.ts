import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { afterEach, describe, expect, it } from 'vitest';

import { ConfigError } from '../../src/errors.js';
import { SqliteRoutesRepository } from '../../src/repositories/routes.repository.js';

const exampleDb = path.resolve(import.meta.dirname, '../../config/universe.db');

describe('SqliteRoutesRepository', () => {
  const cleanups: (() => void)[] = [];
  afterEach(() => {
    cleanups.splice(0).forEach((cleanup) => {
      cleanup();
    });
  });

  it('reads the routes of the example universe', () => {
    const repository = new SqliteRoutesRepository(exampleDb);
    cleanups.push(() => {
      repository.close();
    });

    const routes = repository.findAll();
    expect(routes).toHaveLength(5);
    expect(routes).toContainEqual({ origin: 'Tatooine', destination: 'Dagobah', travelTime: 6 });
    expect(repository.isHealthy()).toBe(true);
  });

  it('throws a ConfigError when the database file does not exist', () => {
    expect(() => new SqliteRoutesRepository('/does/not/exist.db')).toThrow(ConfigError);
  });

  it('rejects invalid rows instead of silently loading them', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'routes-db-'));
    cleanups.push(() => {
      rmSync(dir, { recursive: true, force: true });
    });
    const file = path.join(dir, 'bad.db');
    const db = new DatabaseSync(file);
    db.exec(
      'CREATE TABLE ROUTES (ORIGIN TEXT, DESTINATION TEXT, TRAVEL_TIME INTEGER);' +
        "INSERT INTO ROUTES VALUES ('A', 'B', 0);",
    );
    db.close();

    const repository = new SqliteRoutesRepository(file);
    cleanups.push(() => {
      repository.close();
    });
    expect(() => repository.findAll()).toThrow(/Invalid data in ROUTES table/);
  });
});
