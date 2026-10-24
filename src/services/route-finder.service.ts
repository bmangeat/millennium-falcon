import type { RouteRow, RouteResult } from '@/domain/route.js';
import { NotImplementedError } from '@/errors.js';

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
    // TODO: implement the fastest-route computation using this.routes and this.options.
    throw new NotImplementedError(`Route computation to "${arrival}" is not implemented yet`);
  }
}
