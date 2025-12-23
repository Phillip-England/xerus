// --- START FILE: src/DataBag.ts ---
/**
 * DataBag is a callable + object-like storage used for "validated data".
 *
 * Goals:
 * - Backwards compatible: c.data.someKey / c.data["x"] still works.
 * - New ergonomic API: c.data(Type) returns the instance stored under that ctor.
 * - Also supports c.data("someKey") lookups.
 *
 * Implementation uses a Proxy around a function, backed by:
 * - byKey: Record<string, any>
 * - byCtor: Map<any, any>
 */
export type Ctor<T> = new (...args: any[]) => T;

export type DataBag = ((
  keyOrCtor: string | Ctor<any>,
  fallback?: any,
) => any) & {
  /** Set by string key (and optionally ctor as secondary index) */
  set: (key: string, value: any, ctor?: any) => void;
  /** Set by ctor (and also by ctor.name as a key) */
  setCtor: <T>(Type: Ctor<T>, value: T, keyOverride?: string) => void;
  /** Get by string key */
  get: (key: string, fallback?: any) => any;
  /** Get by ctor */
  getCtor: <T>(Type: Ctor<T>, fallback?: T) => T;
  /** Delete by string key */
  delete: (key: string) => void;
  /** Delete by ctor (and its name key) */
  deleteCtor: (Type: any) => void;
  /** Clear all */
  clear: () => void;
  /** Return shallow object of key-based entries */
  toObject: () => Record<string, any>;
};

function isStringOrSymbol(k: PropertyKey): k is string | symbol {
  return typeof k === "string" || typeof k === "symbol";
}

export function createDataBag(): DataBag {
  const byKey: Record<string, any> = Object.create(null);
  const byCtor = new Map<any, any>();

  const fn: any = (keyOrCtor: any, fallback?: any) => {
    if (typeof keyOrCtor === "string") {
      const v = byKey[keyOrCtor];
      return v === undefined ? fallback : v;
    }
    if (typeof keyOrCtor === "function") {
      const v = byCtor.get(keyOrCtor);
      if (v !== undefined) return v;
      const name = (keyOrCtor as any)?.name;
      if (name && byKey[name] !== undefined) return byKey[name];
      return fallback;
    }
    return fallback;
  };

  fn.set = (key: string, value: any, ctor?: any) => {
    byKey[key] = value;
    if (ctor) byCtor.set(ctor, value);
  };

  fn.setCtor = <T>(Type: Ctor<T>, value: T, keyOverride?: string) => {
    byCtor.set(Type, value);
    const key = keyOverride ?? (Type as any)?.name;
    if (key) byKey[key] = value;
  };

  fn.get = (key: string, fallback?: any) => {
    const v = byKey[key];
    return v === undefined ? fallback : v;
  };

  fn.getCtor = <T>(Type: Ctor<T>, fallback?: T): T => {
    const v = byCtor.get(Type);
    if (v !== undefined) return v as T;
    const name = (Type as any)?.name;
    if (name && byKey[name] !== undefined) return byKey[name] as T;
    return fallback as T;
  };

  fn.delete = (key: string) => {
    delete byKey[key];
  };

  fn.deleteCtor = (Type: any) => {
    byCtor.delete(Type);
    const name = (Type as any)?.name;
    if (name) delete byKey[name];
  };

  fn.clear = () => {
    for (const k of Object.keys(byKey)) delete byKey[k];
    byCtor.clear();
  };

  fn.toObject = () => ({ ...byKey });

  // Proxy makes it behave like a normal object as well:
  // c.data.foo, Object.keys(c.data), delete c.data.foo, etc.
  const proxy = new Proxy(fn, {
    get(_target, prop, receiver) {
      if (prop in fn) return Reflect.get(fn, prop, receiver);
      if (typeof prop === "string") return byKey[prop];
      return undefined;
    },

    set(_target, prop, value) {
      if (typeof prop === "string") {
        byKey[prop] = value;
        return true;
      }
      return false;
    },

    deleteProperty(_target, prop) {
      if (typeof prop === "string") {
        delete byKey[prop];
        return true;
      }
      return false;
    },

    has(_target, prop) {
      if (prop in fn) return true;
      if (typeof prop === "string") return prop in byKey;
      return false;
    },

    // IMPORTANT: ProxyHandler.ownKeys must return (string | symbol)[]
    ownKeys() {
      const fnKeys = Reflect.ownKeys(fn).filter(isStringOrSymbol);
      const keyKeys = Reflect.ownKeys(byKey).filter(isStringOrSymbol);

      // de-dupe while preserving type
      const out = new Set<string | symbol>();
      for (const k of fnKeys) out.add(k);
      for (const k of keyKeys) out.add(k);

      return Array.from(out);
    },

    getOwnPropertyDescriptor(_target, prop) {
      if (prop in fn) {
        return Object.getOwnPropertyDescriptor(fn, prop);
      }
      if (typeof prop === "string" && prop in byKey) {
        return {
          configurable: true,
          enumerable: true,
          writable: true,
          value: byKey[prop],
        };
      }
      return undefined;
    },
  });

  return proxy as DataBag;
}
// --- END FILE: src/DataBag.ts ---
