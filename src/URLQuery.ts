// src/URLQuery.ts
export interface URLQueryView {
  get(key: string): string | null;
  getAll(key: string): string[];
  has(key: string): boolean;
  entries(): IterableIterator<[string, string]>;
  toObject(): Record<string, string>;
}

export class URLQuery implements URLQueryView {
  private params: URLSearchParams;

  constructor(params: URLSearchParams) {
    this.params = params;
  }

  get(key: string): string | null {
    return this.params.get(key);
  }

  getAll(key: string): string[] {
    return this.params.getAll(key);
  }

  has(key: string): boolean {
    return this.params.has(key);
  }

  entries(): IterableIterator<[string, string]> {
    return this.params.entries();
  }

  toObject(): Record<string, string> {
    return Object.fromEntries(this.params.entries());
  }

  ref(key: string): URLQueryRef {
    return new URLQueryRef(this, key);
  }
}

export class URLQueryRef {
  private view: URLQueryView;
  private _key: string;

  constructor(view: URLQueryView, key: string) {
    this.view = view;
    this._key = key;
  }

  get key(): string {
    return this._key;
  }

  get(): string | null {
    return this.view.get(this._key);
  }

  all(): string[] {
    return this.view.getAll(this._key);
  }

  has(): boolean {
    return this.view.has(this._key);
  }
}
