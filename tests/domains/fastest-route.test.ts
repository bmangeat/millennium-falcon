import { describe, expect, it } from 'vitest';
import { findFastestRoute } from '../../src/domain/fastest-route.js';

const rows = [
  { origin: 'Tatooine', destination: 'Dagobah', travelTime: 6 },
  { origin: 'Dagobah', destination: 'Endor', travelTime: 4 },
  { origin: 'Dagobah', destination: 'Hoth', travelTime: 1 },
  { origin: 'Hoth', destination: 'Endor', travelTime: 1 },
  { origin: 'Tatooine', destination: 'Hoth', travelTime: 6 },
];

describe('findFastestRoute', () => {
  it('should find the fastest route', () => {
    expect(findFastestRoute(rows, 'Tatooine', 'Endor', 6)).toEqual({
      route: ['Tatooine', 'Hoth', 'Endor'],
      duration: 8,
    });
  });
  it('handle multiple refuels', () => {
    const rows = [
      { origin: 'A', destination: 'B', travelTime: 6 },
      { origin: 'B', destination: 'C', travelTime: 4 },
      { origin: 'C', destination: 'D', travelTime: 1 },
    ];

    const result = findFastestRoute(rows, 'A', 'D', 6);
    expect(result).toEqual({
      route: ['A', 'B', 'C', 'D'],
      duration: 12,
    });
  });
});
