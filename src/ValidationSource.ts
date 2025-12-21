// PATH: /Users/phillipengland/src/xerus/src/ValidationSource.ts

import type { HTTPContext } from "./HTTPContext";

export type ValidationSource =
  | { kind: "JSON" }
  | { kind: "FORM"; formMode?: "last" | "multi" | "params" }
  | { kind: "QUERY"; key?: string }
  | { kind: "PARAM"; key?: string }
  | { kind: "WSMESSAGE" }
  | { kind: "CUSTOM"; name?: string; provider: (c: HTTPContext) => any | Promise<any> };

export class Source {
  static JSON(): ValidationSource {
    return { kind: "JSON" };
  }

  static FORM(formMode?: "last" | "multi" | "params"): ValidationSource {
    return { kind: "FORM", formMode };
  }

  static QUERY(key?: string): ValidationSource {
    return { kind: "QUERY", key };
  }

  static PARAM(key?: string): ValidationSource {
    return { kind: "PARAM", key };
  }

  static WSMESSAGE(): ValidationSource {
    return { kind: "WSMESSAGE" };
  }

  /**
   * Custom injection / DI-style input.
   * You can provide anything here (db handle, auth principal, etc).
   */
  static CUSTOM(provider: (c: HTTPContext) => any | Promise<any>, name?: string): ValidationSource {
    return { kind: "CUSTOM", provider, name };
  }
}
