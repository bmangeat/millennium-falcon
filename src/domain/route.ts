export interface Route {
  origin: string;
  destination: string;
  travelTime: number;
}

export interface RouteResult {
  duration: number;
  route: string[];
}
