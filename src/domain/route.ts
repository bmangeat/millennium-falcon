export interface RouteRow {
  origin: string;
  destination: string;
  travelTime: number;
}

export interface RouteResult {
  duration: number;
  route: string[];
}
