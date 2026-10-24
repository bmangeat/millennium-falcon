import { FastestRouteSolver } from '@/domain/fastest-route.js';
import type { RouteRow, RouteResult } from '@/domain/route.js';

export interface RouteFinderOptions {
  autonomy: number;
  departure: string;
}

export interface RouteFinder {
  findFastestRoute(arrival: string): RouteResult | null;
}

export class RouteFinderService implements RouteFinder {
  private readonly routes: readonly RouteRow[];
  private readonly options: RouteFinderOptions;
  private readonly solver: FastestRouteSolver;

  constructor(routes: readonly RouteRow[], options: RouteFinderOptions) {
    this.routes = routes;
    this.options = options;
    const { departure, autonomy } = this.options;

    // Avoid to rebuild the graph everytime,
    // We precompute everything for a given departure/autonomy
    // and cache it in this instance, so we can reuse it for multiple requests
    // We can do it because departure and autonomy are fixed for the lifetime of the instance
    this.solver = new FastestRouteSolver(routes, departure, autonomy);
  }

  findFastestRoute(arrival: string): RouteResult | null {
    return this.solver.solve(arrival);
  }
}
