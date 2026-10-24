import { describe, it, expect } from 'vitest';
import { buildGraph } from '../../src/domain/graph.js';

describe('Graph builder', () => {
  it('builds a graph from routes', () => {
    const routes = [
      {
        origin: 'A',
        destination: 'B',
        travelTime: 1,
      },
      {
        origin: 'B',
        destination: 'C',
        travelTime: 2,
      },
    ];
    const graph = buildGraph(routes);
    expect(graph).toEqual(
      new Map([
        ['A', [{ to: 'B', weight: 1 }]],
        [
          'B',
          [
            { to: 'A', weight: 1 },
            { to: 'C', weight: 2 },
          ],
        ],
        ['C', [{ to: 'B', weight: 2 }]],
      ]),
    );
  });
  it('rejects route rows with invalid values', () => {
    const routes = [
      {
        origin: 'A',
        destination: 'B',
        travelTime: 1,
      },
      {
        origin: 'B',
        destination: 'C',
        travelTime: -2,
      },
    ];
    expect(() => buildGraph(routes)).toThrow();
  });
});
