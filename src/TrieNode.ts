import type { HTTPErrorHandlerFunc } from "./HTTPHandlerFunc";
import type { XerusRoute } from "./XerusRoute";

export interface RouteBlueprint {
  Ctor: new () => XerusRoute;
  errHandler?: HTTPErrorHandlerFunc;

  mounted?: {
    props: Record<string, any>;
  };

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
