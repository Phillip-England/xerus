export type RouteBlueprint = {
  Ctor: new () => any; // XerusRoute ctor (kept loose here to avoid circular imports)
  middlewares: any[]; // XerusMiddleware<any>[]
  errHandler?: any; // HTTPErrorHandlerFunc
  wsChain?: {
    open?: RouteBlueprint;
    message?: RouteBlueprint;
    close?: RouteBlueprint;
    drain?: RouteBlueprint;
  };
};

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
