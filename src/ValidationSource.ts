// PATH: /home/jacex/src/xerus/src/ValidationSource.ts

export enum SourceType {
  // HTTP body
  JSON = "JSON",
  FORM = "FORM",
  MULTIPART = "MULTIPART",
  TEXT = "TEXT",

  // HTTP request metadata
  QUERY = "QUERY",
  PARAM = "PARAM",
  HEADER = "HEADER",

  // WS event sources
  WS_MESSAGE = "WS_MESSAGE",
  WS_CLOSE = "WS_CLOSE",
}

// -----------------------------
// Discriminated unions (typed)
// -----------------------------

export type HTTPValidationSource =
  | { type: SourceType.JSON }
  | { type: SourceType.FORM }
  | { type: SourceType.MULTIPART }
  | { type: SourceType.TEXT }
  | { type: SourceType.QUERY; key?: string }         // ✅ key optional (all query params if omitted)
  | { type: SourceType.PARAM; key: string }          // ✅ key required
  | { type: SourceType.HEADER; key: string };        // ✅ key required

export type WSOnlyValidationSource =
  | { type: SourceType.WS_MESSAGE }
  | { type: SourceType.WS_CLOSE };

export type WSValidationSource = HTTPValidationSource | WSOnlyValidationSource;

// -----------------------------
// Factory helpers (public API)
// -----------------------------

export class Source {
  // HTTP body
  static JSON(): HTTPValidationSource {
    return { type: SourceType.JSON };
  }

  static FORM(): HTTPValidationSource {
    return { type: SourceType.FORM };
  }

  static MULTIPART(): HTTPValidationSource {
    return { type: SourceType.MULTIPART };
  }

  static TEXT(): HTTPValidationSource {
    return { type: SourceType.TEXT };
  }

  // HTTP metadata
  static QUERY(key?: string): HTTPValidationSource {
    return { type: SourceType.QUERY, key };
  }

  static PARAM(key: string): HTTPValidationSource {
    return { type: SourceType.PARAM, key };
  }

  static HEADER(key: string): HTTPValidationSource {
    return { type: SourceType.HEADER, key };
  }

  // WS-only
  static WS_MESSAGE(): WSValidationSource {
    return { type: SourceType.WS_MESSAGE };
  }

  static WS_CLOSE(): WSValidationSource {
    return { type: SourceType.WS_CLOSE };
  }
}
