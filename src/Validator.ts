import { Middleware } from "./Middleware";
import { HTTPContext } from "./HTTPContext";
import type { Constructable } from "./HTTPContext";
import { BodyType } from "./BodyType";
import { SystemErr } from "./SystemErr";
import { SystemErrCode } from "./SystemErrCode";
import { SourceType, type HTTPValidationSource } from "./ValidationSource";
import type { TypeValidator } from "./TypeValidator";

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    if (Error.captureStackTrace) Error.captureStackTrace(this, ValidationError);
  }
}

export class Validator<T = any> {
  private _value: any;

  constructor(value: any) {
    this._value = value;
  }

  get value(): T {
    return this._value as T;
  }

  set(value: any): this {
    this._value = value;
    return this;
  }

  unwrap(): T {
    return this.value;
  }

  private isEmpty(v: any) {
    return v === undefined || v === null || (typeof v === "string" && v.trim().length === 0);
  }

  private err(message: string): never {
    throw new ValidationError(message);
  }

  private ensureNumber(message = "Expected a number"): number {
    const v = this._value;
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim().length > 0) {
      const n = Number(v);
      if (Number.isFinite(n)) return n;
    }
    this.err(message);
  }

  required(message = "Value is required"): this {
    if (this.isEmpty(this._value)) this.err(message);
    return this;
  }

  optional(): this {
    return this;
  }

  defaultTo(value: any): this {
    if (this.isEmpty(this._value)) this._value = value;
    return this;
  }

  isString(message = "Expected a string"): this {
    const v = this._value;
    if (typeof v === "string") return this;
    if (v === undefined || v === null) this.err(message);
    this._value = String(v);
    return this;
  }

  trim(): this {
    if (typeof this._value !== "string") this.err("Expected a string to trim");
    this._value = this._value.trim();
    return this;
  }

  toLower(): this {
    if (typeof this._value !== "string") this.err("Expected a string");
    this._value = this._value.toLowerCase();
    return this;
  }

  toUpper(): this {
    if (typeof this._value !== "string") this.err("Expected a string");
    this._value = this._value.toUpperCase();
    return this;
  }

  nonEmpty(message = "Must not be empty"): this {
    if (typeof this._value !== "string") this.err("Expected a string");
    if (this._value.trim().length === 0) this.err(message);
    return this;
  }

  minLength(n: number, message?: string): this {
    if (typeof this._value !== "string") this.err("Expected a string");
    if (this._value.length < n) this.err(message ?? `Must be at least ${n} characters`);
    return this;
  }

  maxLength(n: number, message?: string): this {
    if (typeof this._value !== "string") this.err("Expected a string");
    if (this._value.length > n) this.err(message ?? `Must be at most ${n} characters`);
    return this;
  }

  matches(re: RegExp, message = "Invalid format"): this {
    if (typeof this._value !== "string") this.err("Expected a string");
    if (!re.test(this._value)) this.err(message);
    return this;
  }

  isEmail(message = "Invalid email"): this {
    return this.matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, message);
  }

  isUUID(message = "Invalid UUID"): this {
    return this.matches(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      message,
    );
  }

  isNumber(message = "Expected a number"): this {
    const n = this.ensureNumber(message);
    this._value = n;
    return this;
  }

  isInt(message = "Expected an integer"): this {
    const n = this.ensureNumber(message);
    if (!Number.isInteger(n)) this.err(message);
    this._value = n;
    return this;
  }

  min(n: number, message?: string): this {
    const v = this.ensureNumber("Expected a number");
    if (v < n) this.err(message ?? `Must be >= ${n}`);
    return this;
  }

  max(n: number, message?: string): this {
    const v = this.ensureNumber("Expected a number");
    if (v > n) this.err(message ?? `Must be <= ${n}`);
    return this;
  }

  greaterThan(n: number, message?: string): this {
    const v = this.ensureNumber("Expected a number");
    if (!(v > n)) this.err(message ?? `Must be > ${n}`);
    return this;
  }

  lessThan(n: number, message?: string): this {
    const v = this.ensureNumber("Expected a number");
    if (!(v < n)) this.err(message ?? `Must be < ${n}`);
    return this;
  }

  gt(n: number, message?: string) {
    return this.greaterThan(n, message);
  }

  lt(n: number, message?: string) {
    return this.lessThan(n, message);
  }

  isBoolean(message = "Expected a boolean"): this {
    const v = this._value;
    if (typeof v === "boolean") return this;

    if (typeof v === "number") {
      this._value = v !== 0;
      return this;
    }

    if (typeof v === "string") {
      const s = v.trim().toLowerCase();
      if (["true", "1", "yes", "y", "on"].includes(s)) {
        this._value = true;
        return this;
      }
      if (["false", "0", "no", "n", "off"].includes(s)) {
        this._value = false;
        return this;
      }
    }

    this.err(message);
  }

  oneOf<TVal extends string | number>(values: readonly TVal[], message?: string): this {
    const ok = values.includes(this._value as any);
    if (!ok) this.err(message ?? `Must be one of: ${values.join(", ")}`);
    return this;
  }

  asArray(): this {
    if (Array.isArray(this._value)) return this;
    this._value = [this._value];
    return this;
  }

  arrayOf(item: (v: Validator) => any | void, opts?: { min?: number; max?: number }): this {
    if (!Array.isArray(this._value)) this._value = [this._value];

    const out: any[] = [];
    for (const x of this._value) {
      const vv = new Validator(x);
      const ret = item(vv);
      out.push(ret instanceof Validator ? ret.value : ret === undefined ? vv.value : ret);
    }

    if (opts?.min !== undefined && out.length < opts.min) this.err(`Must have at least ${opts.min} items`);
    if (opts?.max !== undefined && out.length > opts.max) this.err(`Must have at most ${opts.max} items`);

    this._value = out;
    return this;
  }

  isObject(message = "Expected an object"): this {
    const v = this._value;
    if (v && typeof v === "object" && !Array.isArray(v)) return this;
    this.err(message);
  }

  pick(key: string, message = "Expected an object"): this {
    this.isObject(message);
    this._value = (this._value as any)[key];
    return this;
  }

  shape(schema: Record<string, (v: Validator) => any | void>): this {
    this.isObject("Expected an object");
    const obj = this._value as Record<string, any>;
    const out: Record<string, any> = { ...obj };

    for (const [k, fn] of Object.entries(schema)) {
      try {
        const vv = new Validator(obj[k]);
        const ret = fn(vv);
        out[k] = ret instanceof Validator ? ret.value : ret === undefined ? vv.value : ret;
      } catch (e: any) {
        this.err(`Field "${k}": ${e?.message ?? String(e)}`);
      }
    }

    this._value = out;
    return this;
  }

  parseJSON<TOut = any>(message = "Invalid JSON"): this {
    if (typeof this._value !== "string") this.err("Expected JSON string");
    try {
      this._value = JSON.parse(this._value) as TOut;
      return this;
    } catch {
      this.err(message);
    }
  }

  isISODateString(message = "Expected ISO date (YYYY-MM-DD)"): this {
    if (typeof this._value !== "string") this.err(message);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(this._value)) this.err(message);
    return this;
  }

  asDate(message = "Invalid date"): this {
    const v = this._value;

    if (v instanceof Date) {
      if (Number.isNaN(v.getTime())) this.err(message);
      return this;
    }

    if (typeof v === "number") {
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) this.err(message);
      this._value = d;
      return this;
    }

    if (typeof v === "string") {
      const s = v.trim();
      if (s.length === 0) this.err(message);

      if (/^\d+$/.test(s)) {
        const n = Number(s);
        if (!Number.isFinite(n)) this.err(message);
        const ms = s.length <= 10 ? n * 1000 : n;
        const d = new Date(ms);
        if (Number.isNaN(d.getTime())) this.err(message);
        this._value = d;
        return this;
      }

      const d = new Date(s);
      if (Number.isNaN(d.getTime())) this.err(message);
      this._value = d;
      return this;
    }

    this.err(message);
  }

  asISODate(message = "Expected ISO date (YYYY-MM-DD)"): this {
    this.isISODateString(message);
    const d = new Date(`${this._value}T00:00:00.000Z`);
    if (Number.isNaN(d.getTime())) this.err(message);
    this._value = d;
    return this;
  }

  minDate(min: Date, message?: string): this {
    if (!(this._value instanceof Date) || Number.isNaN(this._value.getTime())) this.err("Expected a Date");
    if (this._value.getTime() < min.getTime()) this.err(message ?? `Date must be >= ${min.toISOString()}`);
    return this;
  }

  maxDate(max: Date, message?: string): this {
    if (!(this._value instanceof Date) || Number.isNaN(this._value.getTime())) this.err("Expected a Date");
    if (this._value.getTime() > max.getTime()) this.err(message ?? `Date must be <= ${max.toISOString()}`);
    return this;
  }
}

export function extractHTTPRaw(c: HTTPContext, source: HTTPValidationSource): Promise<any> | any {
  switch (source.type) {
    case SourceType.JSON:
      return c.parseBody(BodyType.JSON);
    case SourceType.FORM:
      return c.parseBody(BodyType.FORM);
    case SourceType.MULTIPART:
      return c.parseBody(BodyType.MULTIPART_FORM);
    case SourceType.TEXT:
      return c.parseBody(BodyType.TEXT);
    case SourceType.QUERY:
      return source.key ? c.query(source.key, "") : c.queries;
    case SourceType.PARAM:
      return c.getParam(source.key, "");
    case SourceType.HEADER:
      return c.getHeader(source.key);
    default:
      throw new SystemErr(SystemErrCode.INTERNAL_SERVER_ERR, "Unknown validation source");
  }
}

export function HTTPTypeValidator<T extends object>(
  source: HTTPValidationSource,
  Ctor: Constructable<T>,
) {
  return new Middleware(async (c: HTTPContext, next) => {
    let raw: any;
    try {
      raw = await extractHTTPRaw(c, source);
    } catch (e: any) {
      throw new SystemErr(
        SystemErrCode.BODY_PARSING_FAILED,
        `Data Extraction Failed: ${e?.message ?? String(e)}`,
      );
    }

    try {
      const instance: any = new (Ctor as any)(raw);
      const maybeValidate = (instance as TypeValidator<HTTPContext> | undefined)?.validate;
      if (typeof maybeValidate === "function") {
        await maybeValidate.call(instance, c);
      }
      c.validated.set(Ctor, instance);
    } catch (e: any) {
      throw new SystemErr(SystemErrCode.VALIDATION_FAILED, e?.message ?? "Validation failed");
    }

    await next();
  });
}

/**
 * ------------------------------------------------------------
 * Back-compat helper exports (fixes: "Export named 'asString' not found")
 * ------------------------------------------------------------
 *
 * These are tiny convenience functions some apps import directly from "xerus".
 * They wrap Validator and return the coerced/validated primitive.
 */

export function asString(
  value: any,
  opts?: { required?: boolean; trim?: boolean; nonEmpty?: boolean; message?: string },
): string {
  const v = new Validator(value);
  if (opts?.required) v.required(opts.message ?? "Value is required");
  v.isString(opts?.message ?? "Expected a string");
  if (opts?.trim) v.trim();
  if (opts?.nonEmpty) v.nonEmpty(opts?.message ?? "Must not be empty");
  return v.value as any;
}

export function asNumber(
  value: any,
  opts?: { required?: boolean; message?: string },
): number {
  const v = new Validator(value);
  if (opts?.required) v.required(opts.message ?? "Value is required");
  v.isNumber(opts?.message ?? "Expected a number");
  return v.value as any;
}

export function asInt(
  value: any,
  opts?: { required?: boolean; message?: string },
): number {
  const v = new Validator(value);
  if (opts?.required) v.required(opts.message ?? "Value is required");
  v.isInt(opts?.message ?? "Expected an integer");
  return v.value as any;
}

export function asBoolean(
  value: any,
  opts?: { required?: boolean; message?: string },
): boolean {
  const v = new Validator(value);
  if (opts?.required) v.required(opts.message ?? "Value is required");
  v.isBoolean(opts?.message ?? "Expected a boolean");
  return v.value as any;
}
