import { buildGraph } from './graph.js';
import { PriorityQueue } from './priority-queue.js';
import type { RouteResult, RouteRow } from './route.js';

const REFUEL_DURATION = 1;
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

export function findFastestRoute(
  rows: readonly RouteRow[],
  departure: string,
  arrival: string,
  autonomy: number,
): RouteResult | null {
  if (!Number.isInteger(autonomy) || autonomy <= 0) {
    throw new Error('Autonomy must be a positive integer');
  }

  if (departure === arrival) {
    return {
      route: [departure],
      duration: 0,
    };
  }

  const graph = buildGraph(rows.filter((row) => row.travelTime <= autonomy));
  const queue = new PriorityQueue<State>((left, right) => left.duration - right.duration);
  const distances = new Map<string, number>();
  const previous = new Map<string, PreviousStep>();

  const relax = (
    from: State,
    action: PreviousStep['action'],
    planet: string,
    fuel: number,
    duration: number,
  ): void => {
    const key = stateKey(planet, fuel);
    if (duration >= (distances.get(key) ?? Infinity)) return;

    distances.set(key, duration);
    previous.set(key, { previousKey: from.key, action, planet });
    queue.push({ planet, fuel, duration, key });
  };

  const startKey = stateKey(departure, autonomy);
  distances.set(startKey, 0);

  queue.push({
    planet: departure,
    fuel: autonomy,
    duration: 0,
    key: startKey,
  });

  while (!queue.isEmpty()) {
    const current = queue.pop();
    if (current === undefined) break;
    if (current.duration !== distances.get(current.key)) continue;

    if (current.planet === arrival) {
      return {
        route: reconstructRoute(previous, current.key, departure),
        duration: current.duration,
      };
    }

    const neighbors = graph.get(current.planet) ?? [];

    for (const edge of neighbors) {
      if (edge.weight > current.fuel) continue;
      relax(current, 'travel', edge.to, current.fuel - edge.weight, current.duration + edge.weight);
    }

    if (current.fuel < autonomy) {
      relax(current, 'refuel', current.planet, autonomy, current.duration + REFUEL_DURATION);
    }
  }
  return null;
}
