// --- START FILE: src/TrieNode.ts ---
import type { HTTPErrorHandlerFunc } from "./HTTPHandlerFunc";
import type { XerusRoute } from "./XerusRoute";

export interface RouteBlueprint {
  Ctor: new () => XerusRoute;
  errHandler?: HTTPErrorHandlerFunc;

  /**
   * Persisted values captured at mount-time (after onMount()).
   * Xerus copies these onto the per-request route instance.
   */
  mounted?: {
    props: Record<string, any>;
  };

  /**
   * New: declarative activation lists.
   * Kept as `any` ctors here to avoid import cycles.
   */
  services?: Array<new () => any>;
  validators?: Array<new () => any>;

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
