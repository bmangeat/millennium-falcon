import { describe, expect, it } from 'vitest';

import { findFastestRoute } from '@/domain/fastest-route.js';

const rows = [
  { origin: 'Tatooine', destination: 'Dagobah', travelTime: 6 },
  { origin: 'Dagobah', destination: 'Endor', travelTime: 4 },
  { origin: 'Dagobah', destination: 'Hoth', travelTime: 1 },
  { origin: 'Hoth', destination: 'Endor', travelTime: 1 },
  { origin: 'Tatooine', destination: 'Hoth', travelTime: 6 },
];

describe('findFastestRoute', () => {
  it('statement example: reaches Endor in 8 days via Hoth, refueling one day on Hoth', () => {
    expect(findFastestRoute(rows, 'Tatooine', 'Endor', 6)).toEqual({
      route: ['Tatooine', 'Hoth', 'Endor'],
      duration: 8,
    });
  });

  it('returns a duration of 0 and a single-planet route when arrival is the departure', () => {
    expect(findFastestRoute(rows, 'Tatooine', 'Tatooine', 6)).toEqual({
      route: ['Tatooine'],
      duration: 0,
    });
  });

  it('returns null when the arrival planet is unknown', () => {
    expect(findFastestRoute(rows, 'Tatooine', 'UnknownPlanet', 6)).toBeNull();
  });

  it('returns null when the arrival planet is not connected to the departure', () => {
    const disconnectedRows = [
      { origin: 'Tatooine', destination: 'Hoth', travelTime: 2 },
      { origin: 'Dagobah', destination: 'Endor', travelTime: 2 },
    ];
    expect(findFastestRoute(disconnectedRows, 'Tatooine', 'Endor', 6)).toBeNull();
  });

  it('treats routes as bidirectional', () => {
    const bidirectionalRows = [
      { origin: 'Hoth', destination: 'Tatooine', travelTime: 2 },
      { origin: 'Endor', destination: 'Hoth', travelTime: 3 },
    ];
    expect(findFastestRoute(bidirectionalRows, 'Tatooine', 'Endor', 6)).toEqual({
      route: ['Tatooine', 'Hoth', 'Endor'],
      duration: 5,
    });
  });

  it('never uses a route longer than the autonomy', () => {
    const customRows = [
      { origin: 'Tatooine', destination: 'Endor', travelTime: 7 },
      { origin: 'Tatooine', destination: 'Hoth', travelTime: 4 },
      { origin: 'Hoth', destination: 'Endor', travelTime: 4 },
    ];
    // Tatooine -> Endor (7) is longer than autonomy 6, so it must take Tatooine -> Hoth -> Endor with refuel on Hoth
    expect(findFastestRoute(customRows, 'Tatooine', 'Endor', 6)).toEqual({
      route: ['Tatooine', 'Hoth', 'Endor'],
      duration: 9,
    });

    const impossibleRows = [{ origin: 'Tatooine', destination: 'Endor', travelTime: 7 }];
    expect(findFastestRoute(impossibleRows, 'Tatooine', 'Endor', 6)).toBeNull();
  });

  it('refuels (1 day) only when the next jump does not fit in the remaining autonomy', () => {
    const testRows = [
      { origin: 'A', destination: 'B', travelTime: 2 },
      { origin: 'B', destination: 'C', travelTime: 3 },
    ];
    // Remaining fuel after A->B is 4, which fits B->C (3). No refuel needed: 2 + 3 = 5.
    expect(findFastestRoute(testRows, 'A', 'C', 6)).toEqual({
      route: ['A', 'B', 'C'],
      duration: 5,
    });

    // With autonomy 4, remaining fuel after A->B is 2, which does NOT fit B->C (3). Refuels 1 day on B: 2 + 1 + 3 = 6.
    expect(findFastestRoute(testRows, 'A', 'C', 4)).toEqual({
      route: ['A', 'B', 'C'],
      duration: 6,
    });
  });

  it('picks the fastest route when several routes exist', () => {
    const multipleRoutes = [
      // Longer path (duration 6):
      { origin: 'A', destination: 'B', travelTime: 6 },
      // Shorter alternative path (duration 4):
      { origin: 'A', destination: 'C', travelTime: 2 },
      { origin: 'C', destination: 'B', travelTime: 2 },
    ];
    expect(findFastestRoute(multipleRoutes, 'A', 'B', 6)).toEqual({
      route: ['A', 'C', 'B'],
      duration: 4,
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

  it('throws an error when autonomy is not a positive integer', () => {
    expect(() => findFastestRoute(rows, 'Tatooine', 'Endor', 0)).toThrow(
      'Autonomy must be a positive integer',
    );
    expect(() => findFastestRoute(rows, 'Tatooine', 'Endor', -5)).toThrow(
      'Autonomy must be a positive integer',
    );
    expect(() => findFastestRoute(rows, 'Tatooine', 'Endor', 2.5)).toThrow(
      'Autonomy must be a positive integer',
    );
  });
});
