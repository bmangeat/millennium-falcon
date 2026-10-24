import { buildGraph } from './graph.js';
import { PriorityQueue } from './priority-queue.js';
import type { RouteResult, RouteRow } from './route.js';

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
  return JSON.stringify([planet, fuel]);
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

  const usableRows = rows.filter((rows) => rows.travelTime <= autonomy);

  const graph = buildGraph(usableRows);
  const queue = new PriorityQueue<State>((left, right) => left.duration - right.duration);
  const distances = new Map<string, number>();
  const previous = new Map<string, PreviousStep>();

  const startKey = stateKey(departure, autonomy);
  distances.set(startKey, 0);

  queue.push({
    planet: departure,
    fuel: autonomy,
    duration: 0,
    key: startKey,
  });

  while (queue.size() > 0) {
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

      const nextFuel = current.fuel - edge.weight;
      const nextDuration = current.duration + edge.weight;
      const nextKey = stateKey(edge.to, nextFuel);

      const knownDuration = distances.get(nextKey) ?? Infinity;

      if (nextDuration < knownDuration) {
        distances.set(nextKey, nextDuration);
        previous.set(nextKey, {
          previousKey: current.key,
          action: 'travel',
          planet: edge.to,
        });
        queue.push({
          planet: edge.to,
          fuel: nextFuel,
          duration: nextDuration,
          key: nextKey,
        });
      }
    }

    if (current.fuel < autonomy) {
      const nextDuration = current.duration + 1;
      const nextKey = stateKey(current.planet, autonomy);

      const knownDuration = distances.get(nextKey) ?? Infinity;

      if (nextDuration < knownDuration) {
        distances.set(nextKey, nextDuration);
        previous.set(nextKey, {
          previousKey: current.key,
          action: 'refuel',
          planet: current.planet,
        });
        queue.push({
          planet: current.planet,
          fuel: autonomy,
          duration: nextDuration,
          key: nextKey,
        });
      }
    }
  }
  return null;
}
