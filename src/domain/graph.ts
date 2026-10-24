import type { RouteRow } from './route.js';

export interface Edge {
  to: string;
  weight: number;
}
export type Graph = Map<string, Edge[]>;

function addEdge(graph: Graph, from: string, to: string, weight: number): void {
  const edges = graph.get(from);
  if (edges) {
    edges.push({ to, weight });
  } else {
    graph.set(from, [{ to, weight }]);
  }
}

export function buildGraph(rows: readonly RouteRow[]): Graph {
  const graph = new Map<string, Edge[]>();
  if (rows.length === 0) {
    return graph;
  }
  for (const [index, row] of rows.entries()) {
    const { origin, destination, travelTime } = row;
    if (
      !origin ||
      !destination ||
      origin === destination ||
      !Number.isFinite(travelTime) ||
      travelTime < 0
    ) {
      throw new Error(`Invalid route row at index ${index}: ${JSON.stringify(row)}`);
    }

    addEdge(graph, origin, destination, travelTime);
    addEdge(graph, destination, origin, travelTime);
  }
  return graph;
}
