// src/Headers.ts

export interface HeadersView {
  get(name: string): string | null;
  getAll(name: string): string[];
  has(name: string): boolean;
}

export interface HeadersMutable extends HeadersView {
  set(name: string, value: string): void;
  append(name: string, value: string): void;
  delete(name: string): void;
}

function norm(name: string) {
  return name.toLowerCase();
}

/**
 * Response/outgoing headers.
 * Stores multi-values properly (Set-Cookie handled elsewhere).
 */
export class HeadersBag implements HeadersMutable {
  private map = new Map<string, string[]>();

  reset() {
    this.map.clear();
  }

  set(name: string, value: string): void {
    this.map.set(norm(name), [value]);
  }

  append(name: string, value: string): void {
    const key = norm(name);
    const cur = this.map.get(key);
    if (!cur) this.map.set(key, [value]);
    else cur.push(value);
  }

  delete(name: string): void {
    this.map.delete(norm(name));
  }

  get(name: string): string | null {
    const cur = this.map.get(norm(name));
    if (!cur || cur.length === 0) return null;
    return cur[cur.length - 1] ?? null;
  }

  getAll(name: string): string[] {
    return this.map.get(norm(name))?.slice() ?? [];
  }

  has(name: string): boolean {
    return this.map.has(norm(name));
  }

  /**
   * Convert to real Headers, preserving multi-values with append.
   */
  toHeaders(): Headers {
    const h = new Headers();
    for (const [k, values] of this.map.entries()) {
      for (const v of values) h.append(k, v);
    }
    return h;
  }
}

/**
 * Read-only view of request headers.
 */
export class RequestHeaders implements HeadersView {
  private h: Headers;

  constructor(h: Headers) {
    this.h = h;
  }

  get(name: string): string | null {
    return this.h.get(name);
  }

  has(name: string): boolean {
    return this.h.has(name);
  }

  getAll(name: string): string[] {
    const key = norm(name);
    const out: string[] = [];

    // ✅ avoids `.entries()` typing issue
    this.h.forEach((value, headerName) => {
      if (norm(headerName) === key) out.push(value);
    });

    return out;
  }
}

/**
 * Ref handle to one header name on either a request view (read-only)
 * or a response bag (mutable).
 */
export class HeaderRef {
  private view: HeadersView;
  private mutable: HeadersMutable | null;
  private _name: string;

  constructor(view: HeadersView, name: string) {
    this.view = view;
    this.mutable = (view as any)?.set ? (view as HeadersMutable) : null;
    this._name = name;
  }

  get name(): string {
    return this._name;
  }

  get(): string | null {
    return this.view.get(this._name);
  }

  all(): string[] {
    return this.view.getAll(this._name);
  }

  has(): boolean {
    return this.view.has(this._name);
  }

  set(value: string): this {
    if (!this.mutable) {
      throw new Error(`Header "${this._name}" is read-only in this context.`);
    }
    this.mutable.set(this._name, value);
    return this;
  }

  append(value: string): this {
    if (!this.mutable) {
      throw new Error(`Header "${this._name}" is read-only in this context.`);
    }
    this.mutable.append(this._name, value);
    return this;
  }

  delete(): this {
    if (!this.mutable) {
      throw new Error(`Header "${this._name}" is read-only in this context.`);
    }
    this.mutable.delete(this._name);
    return this;
  }
}
