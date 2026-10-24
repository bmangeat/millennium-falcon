import { describe, it, expect } from 'vitest';
import { PriorityQueue } from '@/domain/priority-queue.js';

describe('Priority Queue', () => {
  it('can create and enqueue', () => {
    const queue = new PriorityQueue<number>((a, b) => a - b);
    queue.push(1);
    expect(queue.size()).toBe(1);
    expect(queue.peek()).toEqual(1);
  });
  it('can dequeue', () => {
    const queue = new PriorityQueue<string>((a, b) => a.localeCompare(b));
    queue.push('A');
    queue.push('B');
    expect(queue.pop()).toEqual('A');
    expect(queue.pop()).toEqual('B');
  });
  it('can dequeue in order', () => {
    const queue = new PriorityQueue<string>((a, b) => a.localeCompare(b));
    queue.push('A');
    queue.push('B');
    queue.push('C');
    expect(queue.pop()).toEqual('A');
    expect(queue.pop()).toEqual('B');
    expect(queue.pop()).toEqual('C');
  });
  it('support object comparison', () => {
    const queue = new PriorityQueue<{ name: string; cost: number }>((a, b) => a.cost - b.cost);
    queue.push({ name: 'A', cost: 1 });
    queue.push({ name: 'B', cost: 2 });
    queue.push({ name: 'C', cost: 3 });
    expect(queue.pop()).toEqual({ name: 'A', cost: 1 });
    expect(queue.pop()).toEqual({ name: 'B', cost: 2 });
    expect(queue.pop()).toEqual({ name: 'C', cost: 3 });
  });
});
