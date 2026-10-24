import { describe, it } from 'vitest';

// Unit tests for the route computation. To be implemented together with RouteFinderService.
describe('RouteFinderService.findFastestRoute', () => {
  it.todo('statement example: reaches Endor in 8 days via Hoth, refueling one day on Hoth');
  it.todo('returns a duration of 0 and a single-planet route when arrival is the departure');
  it.todo('returns null when the arrival planet is unknown');
  it.todo('returns null when the arrival planet is not connected to the departure');
  it.todo('treats routes as bidirectional');
  it.todo('never uses a route longer than the autonomy');
  it.todo('refuels (1 day) only when the next jump does not fit in the remaining autonomy');
  it.todo('picks the fastest route when several routes exist');
});
