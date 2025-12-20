// PATH: /home/jacex/src/xerus/src/ValidatedData.ts

import type { Constructable } from "./HTTPContext";

/**
 * ValidatedData
 * A request-scoped container for validated values.
 *
 * New default usage:
 *   data.get("activeDir")
 *   data.maybe("activeDir")
 *
 * Back-compat:
 *   data.get(SomeClass)
 */
export class ValidatedData {
  private store = new Map<Function | string, any>();

  clear() {
    this.store.clear();
  }

  set<T>(key: Constructable<T> | string, value: T): void {
    this.store.set(key, value);
  }

  maybe<T>(key: Constructable<T> | string): T | undefined {
    return this.store.get(key) as T | undefined;
  }

  get<T>(key: Constructable<T> | string): T {
    const val = this.store.get(key);
    if (val === undefined) {
      const keyName =
        typeof key === "string" ? key : (key as any)?.name ? (key as any).name : "UnknownKey";
      throw new Error(
        `ValidatedData missing key "${keyName}". Did you forget to call route.validate(...) or use the correct key?`,
      );
    }
    return val as T;
  }

  getOrThrow<T>(key: Constructable<T> | string): T {
    return this.get<T>(key);
  }
}
