export type Ctor<T> = new (...args: any[]) => T;

export interface DataBag {
  // Make DataBag callable: c.data(Type)
  <T>(Type: Ctor<T>): T | undefined;
  
  // Keep existing methods attached to the function
  setCtor<T>(Type: Ctor<T>, value: T): void;
  getCtor<T>(Type: Ctor<T>): T | undefined;
  requireCtor<T>(Type: Ctor<T>, errMsg?: string): T;
  hasCtor(Type: Ctor<any>): boolean;
  deleteCtor(Type: Ctor<any>): void;
  clear(): void;
}

export function createDataBag(): DataBag {
  const byCtor = new Map<any, any>();

  // 1. Define the main function for c.data(Type)
  const bag = <T>(Type: Ctor<T>): T | undefined => {
    return byCtor.get(Type);
  };

  // 2. Attach the methods to the function instance
  bag.setCtor = <T>(Type: Ctor<T>, value: T) => {
    byCtor.set(Type, value);
  };

  bag.getCtor = <T>(Type: Ctor<T>): T | undefined => {
    return byCtor.get(Type);
  };

  bag.requireCtor = <T>(Type: Ctor<T>, errMsg?: string): T => {
    const v = byCtor.get(Type);
    if (v !== undefined) return v as T;
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

  // 3. Return as the DataBag interface
  return bag as DataBag;
}