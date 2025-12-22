// src/PathParams.ts
export interface PathParamsView {
  get(key: string): string | null;
  has(key: string): boolean;
  toObject(): Record<string, string>;
}

export class PathParams implements PathParamsView {
  private params: Record<string, string>;

  constructor(params: Record<string, string>) {
    this.params = params;
  }

  get(key: string): string | null {
    return this.params[key] ?? null;
  }

  has(key: string): boolean {
    return Object.prototype.hasOwnProperty.call(this.params, key);
  }

  toObject(): Record<string, string> {
    return { ...this.params };
  }

  ref(key: string): PathParamRef {
    return new PathParamRef(this, key);
  }
}

export class PathParamRef {
  private view: PathParamsView;
  private _key: string;

  constructor(view: PathParamsView, key: string) {
    this.view = view;
    this._key = key;
  }

  get key(): string {
    return this._key;
  }

  get(): string | null {
    return this.view.get(this._key);
  }

  has(): boolean {
    return this.view.has(this._key);
  }
}
