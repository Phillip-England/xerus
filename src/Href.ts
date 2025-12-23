export type HrefQueryValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Array<string | number | boolean | null | undefined>;

export type HrefQuery = Record<string, HrefQueryValue>;

function assertNoNewlines(s: string) {
  if (/[\r\n]/.test(s)) {
    throw new Error("Invalid URL: contains newline characters");
  }
}

function normalizeValues(v: HrefQueryValue): string[] {
  if (v === undefined || v === null) return [];
  if (Array.isArray(v)) {
    const out: string[] = [];
    for (const x of v) {
      if (x === undefined || x === null) continue;
      out.push(String(x));
    }
    return out;
  }
  return [String(v)];
}

/**
 * Build a URL/HREF with proper encoding + merging behavior.
 *
 * - Preserves existing query in `path` (e.g. "/?a=1")
 * - Appends/overrides via `query`
 * - Skips null/undefined
 * - Supports arrays => repeated keys: ?tag=a&tag=b
 */
export function href(path: string, query?: HrefQuery): string {
  assertNoNewlines(path);

  // Split path from existing query/hash (if present)
  const hashIndex = path.indexOf("#");
  const hasHash = hashIndex !== -1;
  const beforeHash = hasHash ? path.slice(0, hashIndex) : path;
  const hash = hasHash ? path.slice(hashIndex) : "";

  const qIndex = beforeHash.indexOf("?");
  const basePath = qIndex === -1 ? beforeHash : beforeHash.slice(0, qIndex);
  const existingQuery = qIndex === -1 ? "" : beforeHash.slice(qIndex + 1);

  const params = new URLSearchParams(existingQuery);

  if (query && typeof query === "object") {
    for (const [k, raw] of Object.entries(query)) {
      // If user passes [] we treat as "clear" for that key
      if (Array.isArray(raw) && raw.length === 0) {
        params.delete(k);
        continue;
      }

      // For non-arrays, we overwrite (delete+set) to avoid accidental duplicates
      if (!Array.isArray(raw)) {
        params.delete(k);
        for (const v of normalizeValues(raw)) params.append(k, v);
        continue;
      }

      // Arrays append (repeated keys)
      params.delete(k);
      for (const v of normalizeValues(raw)) params.append(k, v);
    }
  }

  const qs = params.toString();
  return qs.length ? `${basePath}?${qs}${hash}` : `${basePath}${hash}`;
}
