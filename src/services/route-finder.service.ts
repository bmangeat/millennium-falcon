import { computeFastestRoute } from '@/domain/fastest-route.js';
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

  constructor(routes: readonly RouteRow[], options: RouteFinderOptions) {
    this.routes = routes;
    this.options = options;
  }

  findFastestRoute(arrival: string): RouteResult | null {
    const { departure, autonomy } = this.options;
    return computeFastestRoute(this.routes, departure, arrival, autonomy);
  }
}
