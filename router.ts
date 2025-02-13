import { Context } from "./context";
import { Handler } from "./handler";

class TrieNode {
  handlers: Map<string, Handler> = new Map();
  children: Map<string, TrieNode> = new Map();
  paramKey?: string;
  wildcard?: TrieNode;
}

export class Router {
  root: TrieNode = new TrieNode();

  get(path: string, handler: Handler) {
    this.add("GET", path, handler);
  }
  post(path: string, handler: Handler) {
    this.add("POST", path, handler);
  }
  put(path: string, handler: Handler) {
    this.add("PUT", path, handler);
  }
  delete(path: string, handler: Handler) {
    this.add("DELETE", path, handler);
  }

  private add(method: string, path: string, handler: Handler) {
    const parts = path.split("/").filter(Boolean);
    let node = this.root;

    for (const part of parts) {
      if (part.startsWith(":")) {
        if (!node.children.has(":param")) {
          node.children.set(":param", new TrieNode());
          node.children.get(":param")!.paramKey = part.slice(1);
        }
        node = node.children.get(":param")!;
      } else if (part === "*") {
        if (!node.wildcard) {
          node.wildcard = new TrieNode();
        }
        node = node.wildcard;
      } else {
        if (!node.children.has(part)) {
          node.children.set(part, new TrieNode());
        }
        node = node.children.get(part)!;
      }
    }

    // Directly store the method-specific handler at the last node.
    node.handlers.set(method, handler);
  }

  find(req: Request): { handler?: Handler; c: Context } {
    const method = req.method;
    const url = new URL(req.url);
    const path = url.pathname;
    const parts = path.split("/").filter(Boolean);

    let node: TrieNode | undefined = this.root;
    let params: Record<string, string> = {};

    for (const part of parts) {
      if (node!.children.has(part)) {
        node = node!.children.get(part);
      } else if (node!.children.has(":param")) {
        let paramNode = node!.children.get(":param")!;
        params[paramNode.paramKey!] = part; // Capture param value
        node = paramNode;
      } else if (node!.wildcard) {
        node = node!.wildcard;
        break;
      } else {
        return { handler: undefined, c: new Context(req) };
      }
    }

    // Directly check for the method handler at the last matched node.
    const handler = node!.handlers.get(method);
    
    // If no handler is found for the specific method, return undefined.
    return { handler, c: new Context(req, params) };
  }
}
