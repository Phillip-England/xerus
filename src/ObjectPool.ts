export class ObjectPool<T> {
  private items: T[] = [];
  private factory: () => T;
  private limit: number;

  constructor(factory: () => T, size: number) {
    this.factory = factory;
    this.limit = size;

    // Pre-fill the pool
    for (let i = 0; i < size; i++) {
      this.items.push(this.factory());
    }
  }

  acquire(): T {
    const item = this.items.pop();
    // If pool is empty, create a new one on the fly (burst handling)
    return item ?? this.factory();
  }

  release(item: T): void {
    // Only push back if we haven't exceeded the limit
    if (this.items.length < this.limit) {
      this.items.push(item);
    }
  }

  resize(newSize: number) {
    this.limit = newSize;
    // If current size is smaller than new size, fill it up
    while (this.items.length < newSize) {
      this.items.push(this.factory());
    }
    // If current size is larger, we don't force drain, 
    // we just let acquire/release naturally balance it out.
  }
}