import { buildGraph } from './graph.js';
import { PriorityQueue } from './priority-queue.js';
import type { RouteResult, RouteRow } from './route.js';

const REFUEL_DURATION = 1;
const MAX_STATES = 1_000_000;

interface State {
  planet: string;
  fuel: number;
  duration: number;
  key: string;
}

interface PreviousStep {
  previousKey: string;
  action: 'travel' | 'refuel';
  planet: string;
}

interface Arrival {
  key: string;
  duration: number;
}

function stateKey(planet: string, fuel: number): string {
  return `${fuel}:${planet}`;
}

function reconstructRoute(
  previous: Map<string, PreviousStep>,
  finalKey: string,
  departure: string,
): string[] {
  const route: string[] = [];
  let currentKey: string = finalKey;

  while (previous.has(currentKey)) {
    const step = previous.get(currentKey);
    if (step === undefined) break;

    if (step.action === 'travel') {
      route.push(step.planet);
    }
    currentKey = step.previousKey;
  }

  route.push(departure);
  return route.reverse();
}

export class FastestRouteSolver {
  private readonly distances = new Map<string, number>();
  private readonly previous = new Map<string, PreviousStep>();
  private readonly bestArrivals = new Map<string, Arrival>();

  constructor(
    rows: readonly RouteRow[],
    private readonly departure: string,
    private readonly autonomy: number,
  ) {
    if (!Number.isInteger(autonomy) || autonomy <= 0) {
      throw new Error('Autonomy must be a positive integer');
    }
    if (!rows.some((row) => row.origin === departure || row.destination === departure)) {
      throw new Error(`Unknown departure planet: ${departure}`);
    }

    this.explore(rows);
  }

  get exploredStates(): number {
    return this.distances.size;
  }

  solve(arrival: string): RouteResult | null {
    const best = this.bestArrivals.get(arrival);
    if (best === undefined) return null;

    return {
      route: reconstructRoute(this.previous, best.key, this.departure),
      duration: best.duration,
    };
  }

  private explore(rows: readonly RouteRow[]): void {
    const { departure } = this;

    // Route longer than autonomy can not be fulfilled, so we filter them out
    const usableRows = rows.filter((row) => row.travelTime <= autonomy);

    const graph = buildGraph(usableRows);

    // totalWeight: sum of all travel times in the universe
    // Will cover the case of a autonomy greater than the total weight of all edges in the universe
    const totalWeight = usableRows.reduce((sum, row) => sum + row.travelTime, 0);
    const autonomy = Math.min(this.autonomy, totalWeight);

    // If the total weight of all edges is less than the autonomy, we can reach every planet from any other planet
    const stateCount = graph.size * (autonomy + 1);
    if (stateCount > MAX_STATES) {
      throw new Error(
        `State space too large (${stateCount} > ${MAX_STATES}): reduce autonomy or universe size`,
      );
    }

    const queue = new PriorityQueue<State>((left, right) => left.duration - right.duration);

    const relax = (
      from: State,
      action: PreviousStep['action'],
      planet: string,
      fuel: number,
      duration: number,
    ): void => {
      const key = stateKey(planet, fuel);
      if (duration >= (this.distances.get(key) ?? Infinity)) return;

      this.distances.set(key, duration);
      this.previous.set(key, { previousKey: from.key, action, planet });
      queue.push({ planet, fuel, duration, key });
    };

    const startKey = stateKey(departure, autonomy);
    this.distances.set(startKey, 0);
    queue.push({ planet: departure, fuel: autonomy, duration: 0, key: startKey });

    while (!queue.isEmpty()) {
      const current = queue.pop();
      if (current === undefined) break;
      if (current.duration !== this.distances.get(current.key)) continue;

      if (!this.bestArrivals.has(current.planet)) {
        this.bestArrivals.set(current.planet, { key: current.key, duration: current.duration });
      }

      for (const edge of graph.get(current.planet) ?? []) {
        if (edge.weight > current.fuel) continue;
        relax(current, 'travel', edge.to, current.fuel - edge.weight, current.duration + edge.weight);
      }

      if (current.fuel < autonomy) {
        relax(current, 'refuel', current.planet, autonomy, current.duration + REFUEL_DURATION);
      }
    }
  }
}