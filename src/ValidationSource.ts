import type { HTTPContext } from "./HTTPContext";
import type { ParsedFormBodyLast, ParsedFormBodyMulti } from "./HTTPContext";

/**
 * A ValidationSource now carries the *type* of the raw value it produces.
 */
export type ValidationSource<TRaw = unknown> =
  | { kind: "JSON" } & { __raw?: TRaw }
  | { kind: "FORM"; formMode?: "last" } & { __raw?: ParsedFormBodyLast }
  | { kind: "FORM"; formMode: "multi" } & { __raw?: ParsedFormBodyMulti }
  | { kind: "FORM"; formMode: "params" } & { __raw?: URLSearchParams }
  | { kind: "QUERY"; key?: string } & { __raw?: TRaw }
  | { kind: "PARAM"; key?: string } & { __raw?: TRaw }
  | { kind: "WSMESSAGE" } & { __raw?: string | Buffer | null };

export class Source {
  static JSON<J = any>(): ValidationSource<J> {
    return { kind: "JSON" } as ValidationSource<J>;
  }

  // FORM: type depends on mode
  static FORM(formMode?: "last"): ValidationSource<ParsedFormBodyLast>;
  static FORM(formMode: "multi"): ValidationSource<ParsedFormBodyMulti>;
  static FORM(formMode: "params"): ValidationSource<URLSearchParams>;
  static FORM(
    formMode: "last" | "multi" | "params" = "last",
  ): ValidationSource<any> {
    return { kind: "FORM", formMode } as any;
  }

  // QUERY: if key provided => string, else => Record<string,string>
  static QUERY(key: string): ValidationSource<string>;
  static QUERY(): ValidationSource<Record<string, string>>;
  static QUERY(key?: string): ValidationSource<any> {
    return { kind: "QUERY", key } as any;
  }

  // PARAM: same idea
  static PARAM(key: string): ValidationSource<string>;
  static PARAM(): ValidationSource<Record<string, string>>;
  static PARAM(key?: string): ValidationSource<any> {
    return { kind: "PARAM", key } as any;
  }

  static WSMESSAGE(): ValidationSource<string | Buffer | null> {
    return { kind: "WSMESSAGE" };
  }
}
