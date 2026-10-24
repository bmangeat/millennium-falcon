import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { loadFalconConfig } from '@/config/falcon-config.js';
import { ConfigError } from '@/errors.js';

describe('loadFalconConfig', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'falcon-config-'));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  const write = (content: unknown): string => {
    const file = path.join(dir, 'millennium-falcon.json');
    writeFileSync(file, typeof content === 'string' ? content : JSON.stringify(content));
    return file;
  };

  it('resolves a relative routes_db against the config file directory', () => {
    const file = write({ autonomy: 6, departure: 'Tatooine', routes_db: 'universe.db' });
    expect(loadFalconConfig(file)).toEqual({
      autonomy: 6,
      departure: 'Tatooine',
      routesDbPath: path.join(dir, 'universe.db'),
    });
  });

  it('keeps an absolute routes_db untouched', () => {
    const file = write({ autonomy: 6, departure: 'Tatooine', routes_db: '/data/universe.db' });
    expect(loadFalconConfig(file).routesDbPath).toBe('/data/universe.db');
  });

  it.each([
    ['missing file', () => path.join(dir, 'absent.json')],
    ['invalid JSON', () => write('{ not json')],
    [
      'non-positive autonomy',
      () => write({ autonomy: 0, departure: 'Tatooine', routes_db: 'a.db' }),
    ],
    ['empty departure', () => write({ autonomy: 6, departure: '', routes_db: 'a.db' })],
    ['missing routes_db', () => write({ autonomy: 6, departure: 'Tatooine' })],
  ])('throws a ConfigError on %s', (_label, setup) => {
    expect(() => loadFalconConfig(setup())).toThrow(ConfigError);
  });
});
