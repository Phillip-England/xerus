// src/TrieNode.ts

export type RouteBlueprint = {
  Ctor: new () => any; // XerusRoute ctor (kept loose here to avoid circular imports)
  middlewares: any[];  // Middleware<any>[]
  errHandler?: any;    // HTTPErrorHandlerFunc
  wsChain?: {
    open?: RouteBlueprint;
    message?: RouteBlueprint;
    close?: RouteBlueprint;
    drain?: RouteBlueprint;
  };
};

export class TrieNode {
  // For HTTP methods (GET/POST/etc) store the RouteBlueprint you execute
  handlers: Record<string, RouteBlueprint> = {};

  // For WebSocket (leaf) store the 4 WS event blueprints
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
