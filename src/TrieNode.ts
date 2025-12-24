// --- START FILE: src/TrieNode.ts ---
import type { HTTPErrorHandlerFunc } from "./HTTPHandlerFunc";
import type { XerusRoute, AnyServiceCtor, AnyValidatorCtor } from "./XerusRoute";

export interface RouteBlueprint {
  Ctor: new () => XerusRoute;
  errHandler?: HTTPErrorHandlerFunc;
  mounted?: {
    props: Record<string, any>;
  };

  // ✅ Unified typing: service/validator ctor lists are the same for HTTP + WS.
  services?: AnyServiceCtor[];
  validators?: AnyValidatorCtor[];

  wsChain?: {
    open?: RouteBlueprint;
    message?: RouteBlueprint;
    close?: RouteBlueprint;
    drain?: RouteBlueprint;
  };
}

export class TrieNode {
  handlers: Record<string, RouteBlueprint> = {};
  wsHandler?: {
    open?: RouteBlueprint;
    message?: RouteBlueprint;
    close?: RouteBlueprint;
    drain?: RouteBlueprint;
  };
  children: Record<string, TrieNode> = {};
  paramKey?: string;
  wildcard?: TrieNode;
}
// --- END FILE ---
