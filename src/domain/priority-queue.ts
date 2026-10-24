export type Comparator<T> = (left: T, right: T) => number;

export class PriorityQueue<T> {
  private items: T[] = [];

  constructor(private readonly comparator: Comparator<T>) {}

  size(): number {
    return this.items.length;
  }

  isEmpty(): boolean {
    return this.size() === 0;
  }

  peek(): T | undefined {
    return this.items[0];
  }

  push(value: T): void {
    this.items.push(value);
    this.bubbleUp(this.items.length - 1);
  }

  pop(): T | undefined {
    if (this.items.length === 0) {
      return undefined;
    }
    const root = this.at(0);
    const last = this.items.pop() as T;

    if (this.items.length > 0) {
      this.items[0] = last;
      this.bubbleDown(0);
    }
    return root;
  }

  private bubbleUp(startIndex: number): void {
    let currentIndex = startIndex;
    while (currentIndex > 0) {
      const parentIndex = Math.floor((currentIndex - 1) / 2);

      const current = this.at(currentIndex);
      const parent = this.at(parentIndex);

      if (this.comparator(current, parent) >= 0) {
        return;
      }

      this.swap(currentIndex, parentIndex);
      currentIndex = parentIndex;
    }
  }

  private bubbleDown(startIndex: number): void {
    const length = this.items.length;
    let currentIndex = startIndex;
    let leftChildIndex = 2 * currentIndex + 1;

    while (leftChildIndex < length) {
      const rightChildIndex = leftChildIndex + 1;
      const bestIndex =
        rightChildIndex < length &&
        this.comparator(this.at(rightChildIndex), this.at(leftChildIndex)) < 0
          ? rightChildIndex
          : leftChildIndex;

      if (this.comparator(this.at(currentIndex), this.at(bestIndex)) <= 0) {
        return;
      }

      this.swap(currentIndex, bestIndex);
      currentIndex = bestIndex;
      leftChildIndex = 2 * currentIndex + 1;
    }
  }

  private at(index: number): T {
    if (index < 0 || index >= this.items.length) {
      throw new RangeError(`Heap index out of bounds: ${index}`);
    }
    return this.items[index] as T;
  }

  private swap(i: number, j: number): void {
    const a = this.at(i);
    this.items[i] = this.at(j);
    this.items[j] = a;
  }
}
