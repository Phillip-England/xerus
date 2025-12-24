// --- START FILE: src/DataBag.ts ---
export type Ctor<T> = new (...args: any[]) => T;

/**
 * DataBag: ctor-keyed storage that supports storing `undefined` values.
 *
 * Important: Map.get() returns `undefined` both for "missing" and "stored undefined".
 * So we must always consult `hasCtor()` for presence checks.
 */
export interface DataBag {
  <T>(Type: Ctor<T>): T | undefined;

  setCtor<T>(Type: Ctor<T>, value: T): void;
  getCtor<T>(Type: Ctor<T>): T | undefined;

  requireCtor<T>(Type: Ctor<T>, errMsg?: string): T;

  hasCtor(Type: Ctor<any>): boolean;
  deleteCtor(Type: Ctor<any>): void;
  clear(): void;
}

export function createDataBag(): DataBag {
  const byCtor = new Map<any, any>();

  const bag = <T>(Type: Ctor<T>): T | undefined => {
    return byCtor.get(Type);
  };

  bag.setCtor = <T>(Type: Ctor<T>, value: T) => {
    byCtor.set(Type, value);
  };

  bag.getCtor = <T>(Type: Ctor<T>): T | undefined => {
    return byCtor.get(Type);
  };

  bag.requireCtor = <T>(Type: Ctor<T>, errMsg?: string): T => {
    if (byCtor.has(Type)) return byCtor.get(Type) as T;
    throw new Error(
      errMsg ??
        `DataBag missing instance for ctor: ${(Type as any)?.name ?? "UnknownType"}`,
    );
  };

  bag.hasCtor = (Type: Ctor<any>): boolean => {
    return byCtor.has(Type);
  };

  bag.deleteCtor = (Type: Ctor<any>) => {
    byCtor.delete(Type);
  };

  bag.clear = () => {
    byCtor.clear();
  };

  return bag as DataBag;
}
// --- END FILE ---
