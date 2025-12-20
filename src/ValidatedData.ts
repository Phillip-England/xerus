import type { Constructable } from "./HTTPContext";

/**
 * ValidatedData
 * A request-scoped container for *validated* data, passed to handlers.
 *
 * It supports:
 * - typed storage by validator class (data.get(MyValidator))
 * - category storage (data.json, data.form, data.query, data.params, data.headers, data.wsMessage, data.wsClose)
 * - string keys (data.get("json"), data.get("query"), data.get("param:id"), etc.)
 */
export class ValidatedData {
  // Common “slots” for convenience
  json: any = undefined;
  form: any = undefined;
  multipart: any = undefined;

  query: any = undefined;
  params: any = undefined;
  headers: any = undefined;

  wsMessage: any = undefined;
  wsClose: any = undefined;

  private store = new Map<Function | string, any>();

  clear() {
    this.json = undefined;
    this.form = undefined;
    this.multipart = undefined;

    this.query = undefined;
    this.params = undefined;
    this.headers = undefined;

    this.wsMessage = undefined;
    this.wsClose = undefined;

    this.store.clear();
  }

  set<T>(key: Constructable<T> | string, value: T): void {
    this.store.set(key, value);
  }

  /**
   * Safe optional getter.
   */
  maybe<T>(key: Constructable<T> | string): T | undefined {
    return this.store.get(key) as T | undefined;
  }

  /**
   * Strict getter: throws if missing.
   * This prevents silent `{}` bugs when validation didn't run or key is wrong.
   */
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

  /**
   * Alias for readability when you want explicitness.
   */
  getOrThrow<T>(key: Constructable<T> | string): T {
    return this.get<T>(key);
  }
}
