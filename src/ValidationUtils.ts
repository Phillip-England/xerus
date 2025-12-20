// PATH: /home/jacex/src/xerus/src/ValidationUtils.ts

import type { ValidateFn } from "./Validator";

/**
 * A small error class to make intent clearer.
 * (Framework will still wrap message into SystemErrCode.VALIDATION_FAILED.)
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    if (Error.captureStackTrace) Error.captureStackTrace(this, ValidationError);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isEmptyValue(v: any) {
  return v === undefined || v === null || (typeof v === "string" && v.trim().length === 0);
}

function asArray(v: any) {
  return Array.isArray(v) ? v : [v];
}

function err(message: string): never {
  throw new ValidationError(message);
}

/**
 * rawValidate(raw, ...fns)
 *
 * Runs a series of validator/transform functions against an arbitrary raw value
 * WITHOUT requiring an HTTPContext (or any context).
 *
 * This is perfect for validating raw values in userland, tests, scripts, etc:
 *
 *   const page = await rawValidate("12", required(), asInt(), min(1));
 *
 * Notes:
 * - Your util validators are typed as ValidateFn<C, In, Out> and expect (c, v).
 *   rawValidate simply passes `undefined` as the context.
 * - Validators may be sync or async; rawValidate is async to support both.
 */
export async function rawValidate<In = any, Out = any>(
  raw: In,
  ...fns: ValidateFn<undefined, any, any>[]
): Promise<Out> {
  let out: any = raw;
  for (const fn of fns) {
    // Provide no context; util validators typically ignore `c` anyway.
    out = await fn(undefined as any, out);
  }
  return out as Out;
}

// ---------------------------------------------------------------------------
// Core combinators
// ---------------------------------------------------------------------------

/**
 * optional(...)
 * - If value is undefined/null/"" (after trim), return undefined and skip the inner validators.
 */
export const optional =
  <C>(...fns: ValidateFn<C, any, any>[]): ValidateFn<C, any, any> =>
  async (c, v) => {
    if (isEmptyValue(v)) return undefined;
    let out = v;
    for (const fn of fns) out = await fn(c, out);
    return out;
  };

/**
 * defaultTo(x)
 * - If value is undefined/null/"" (after trim), returns x.
 */
export const defaultTo =
  <C>(value: any): ValidateFn<C, any, any> =>
  async (_c, v) => {
    if (isEmptyValue(v)) return value;
    return v;
  };

/**
 * oneOfValidators(...)
 * - Runs validators in order until one succeeds.
 * - Useful for "string OR number" parsing, etc.
 */
export const oneOfValidators =
  <C>(...choices: ValidateFn<C, any, any>[]): ValidateFn<C, any, any> =>
  async (c, v) => {
    const errors: string[] = [];
    for (const fn of choices) {
      try {
        return await fn(c, v);
      } catch (e: any) {
        errors.push(e?.message ?? String(e));
      }
    }
    err(errors.length ? errors.join(" OR ") : "No validators matched");
  };

// ---------------------------------------------------------------------------
// Presence / base types
// ---------------------------------------------------------------------------

export const required =
  <C>(message = "Value is required"): ValidateFn<C, any, any> =>
  async (_c, v) => {
    if (isEmptyValue(v)) err(message);
    return v;
  };

export const asString =
  <C>(message = "Expected a string"): ValidateFn<C, any, string> =>
  async (_c, v) => {
    if (typeof v === "string") return v;
    if (v === undefined || v === null) err(message);
    return String(v);
  };

export const trim =
  <C>(): ValidateFn<C, any, string> =>
  async (_c, v) => {
    if (typeof v !== "string") err("Expected a string to trim");
    return v.trim();
  };

export const toLower =
  <C>(): ValidateFn<C, any, string> =>
  async (_c, v) => {
    if (typeof v !== "string") err("Expected a string");
    return v.toLowerCase();
  };

export const toUpper =
  <C>(): ValidateFn<C, any, string> =>
  async (_c, v) => {
    if (typeof v !== "string") err("Expected a string");
    return v.toUpperCase();
  };

export const nonEmpty =
  <C>(message = "Must not be empty"): ValidateFn<C, any, string> =>
  async (_c, v) => {
    if (typeof v !== "string") err("Expected a string");
    if (v.trim().length === 0) err(message);
    return v;
  };

// ---------------------------------------------------------------------------
// String constraints
// ---------------------------------------------------------------------------

export const minLength =
  <C>(n: number, message?: string): ValidateFn<C, any, string> =>
  async (_c, v) => {
    if (typeof v !== "string") err("Expected a string");
    if (v.length < n) err(message ?? `Must be at least ${n} characters`);
    return v;
  };

export const maxLength =
  <C>(n: number, message?: string): ValidateFn<C, any, string> =>
  async (_c, v) => {
    if (typeof v !== "string") err("Expected a string");
    if (v.length > n) err(message ?? `Must be at most ${n} characters`);
    return v;
  };

export const matches =
  <C>(re: RegExp, message = "Invalid format"): ValidateFn<C, any, string> =>
  async (_c, v) => {
    if (typeof v !== "string") err("Expected a string");
    if (!re.test(v)) err(message);
    return v;
  };

export const isEmail =
  <C>(message = "Invalid email"): ValidateFn<C, any, string> =>
  matches<C>(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, message);

export const isUUID =
  <C>(message = "Invalid UUID"): ValidateFn<C, any, string> =>
  matches<C>(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i, message);

// ---------------------------------------------------------------------------
// Numbers
// ---------------------------------------------------------------------------

export const asNumber =
  <C>(message = "Expected a number"): ValidateFn<C, any, number> =>
  async (_c, v) => {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim().length > 0) {
      const n = Number(v);
      if (Number.isFinite(n)) return n;
    }
    err(message);
  };

export const asInt =
  <C>(message = "Expected an integer"): ValidateFn<C, any, number> =>
  async (c, v) => {
    const n = await asNumber<C>(message)(c, v);
    if (!Number.isInteger(n)) err(message);
    return n;
  };

export const min =
  <C>(n: number, message?: string): ValidateFn<C, any, number> =>
  async (_c, v) => {
    if (typeof v !== "number" || !Number.isFinite(v)) err("Expected a number");
    if (v < n) err(message ?? `Must be >= ${n}`);
    return v;
  };

export const max =
  <C>(n: number, message?: string): ValidateFn<C, any, number> =>
  async (_c, v) => {
    if (typeof v !== "number" || !Number.isFinite(v)) err("Expected a number");
    if (v > n) err(message ?? `Must be <= ${n}`);
    return v;
  };

// ---------------------------------------------------------------------------
// Booleans
// ---------------------------------------------------------------------------

export const asBoolean =
  <C>(message = "Expected a boolean"): ValidateFn<C, any, boolean> =>
  async (_c, v) => {
    if (typeof v === "boolean") return v;
    if (typeof v === "number") return v !== 0;
    if (typeof v === "string") {
      const s = v.trim().toLowerCase();
      if (["true", "1", "yes", "y", "on"].includes(s)) return true;
      if (["false", "0", "no", "n", "off"].includes(s)) return false;
    }
    err(message);
  };

// ---------------------------------------------------------------------------
// Enums / sets
// ---------------------------------------------------------------------------

export const oneOf =
  <C, T extends string | number>(values: readonly T[], message?: string): ValidateFn<C, any, T> =>
  async (_c, v) => {
    const ok = values.includes(v as any);
    if (!ok) err(message ?? `Must be one of: ${values.join(", ")}`);
    return v as T;
  };

// ---------------------------------------------------------------------------
// Arrays
// ---------------------------------------------------------------------------

export const asArrayOf =
  <C, T>(item: ValidateFn<C, any, T>, opts?: { min?: number; max?: number }): ValidateFn<C, any, T[]> =>
  async (c, v) => {
    const arr = asArray(v);
    const out: T[] = [];
    for (const x of arr) out.push(await item(c, x));

    if (opts?.min !== undefined && out.length < opts.min) err(`Must have at least ${opts.min} items`);
    if (opts?.max !== undefined && out.length > opts.max) err(`Must have at most ${opts.max} items`);
    return out;
  };

// ---------------------------------------------------------------------------
// Objects / JSON
// ---------------------------------------------------------------------------

export const asObject =
  <C>(message = "Expected an object"): ValidateFn<C, any, Record<string, any>> =>
  async (_c, v) => {
    if (v && typeof v === "object" && !Array.isArray(v)) return v as Record<string, any>;
    err(message);
  };

export const parseJSON =
  <C, T = any>(message = "Invalid JSON"): ValidateFn<C, any, T> =>
  async (_c, v) => {
    if (typeof v !== "string") err("Expected JSON string");
    try {
      return JSON.parse(v) as T;
    } catch {
      err(message);
    }
  };

export const pick =
  <C>(key: string, message?: string): ValidateFn<C, any, any> =>
  async (c, v) => {
    const obj = await asObject<C>(message ?? "Expected an object")(c, v);
    return obj[key];
  };

export const shape =
  <C>(schema: Record<string, ValidateFn<C, any, any>>): ValidateFn<C, any, Record<string, any>> =>
  async (c, v) => {
    const obj = await asObject<C>()(c, v);
    const out: Record<string, any> = { ...obj };

    for (const [k, fn] of Object.entries(schema)) {
      try {
        out[k] = await fn(c, obj[k]);
      } catch (e: any) {
        err(`Field "${k}": ${e?.message ?? String(e)}`);
      }
    }

    return out;
  };

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

export const asDate =
  <C>(message = "Invalid date"): ValidateFn<C, any, Date> =>
  async (_c, v) => {
    // Accept Date directly
    if (v instanceof Date) {
      if (Number.isNaN(v.getTime())) err(message);
      return v;
    }

    // Accept numeric milliseconds/seconds
    if (typeof v === "number") {
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) err(message);
      return d;
    }

    if (typeof v === "string") {
      const s = v.trim();
      if (s.length === 0) err(message);

      // ✅ Accept numeric timestamp string:
      // - 13 digits => ms
      // - 10 digits (or fewer) => seconds (common)
      if (/^\d+$/.test(s)) {
        const n = Number(s);
        if (!Number.isFinite(n)) err(message);

        const ms = s.length <= 10 ? n * 1000 : n;
        const d = new Date(ms);
        if (Number.isNaN(d.getTime())) err(message);
        return d;
      }

      // Fallback: Date can parse ISO / RFC strings
      const d = new Date(s);
      if (Number.isNaN(d.getTime())) err(message);
      return d;
    }

    err(message);
  };

export const isISODateString =
  <C>(message = "Expected ISO date (YYYY-MM-DD)"): ValidateFn<C, any, string> =>
  matches<C>(/^\d{4}-\d{2}-\d{2}$/, message);

export const asISODate =
  <C>(message = "Expected ISO date (YYYY-MM-DD)"): ValidateFn<C, any, Date> =>
  async (c, v) => {
    const s = await isISODateString<C>(message)(c, v);
    const d = new Date(`${s}T00:00:00.000Z`);
    if (Number.isNaN(d.getTime())) err(message);
    return d;
  };

export const minDate =
  <C>(min: Date, message?: string): ValidateFn<C, any, Date> =>
  async (_c, v) => {
    if (!(v instanceof Date) || Number.isNaN(v.getTime())) err("Expected a Date");
    if (v.getTime() < min.getTime()) err(message ?? `Date must be >= ${min.toISOString()}`);
    return v;
  };

export const maxDate =
  <C>(max: Date, message?: string): ValidateFn<C, any, Date> =>
  async (_c, v) => {
    if (!(v instanceof Date) || Number.isNaN(v.getTime())) err("Expected a Date");
    if (v.getTime() > max.getTime()) err(message ?? `Date must be <= ${max.toISOString()}`);
    return v;
  };
