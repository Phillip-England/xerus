import { HTTPHandler } from "./HTTPHandler";
import { WSHandler } from "./WSHandler";

export class TrieNode {
  handlers: Record<string, HTTPHandler> = {};
  wsHandler?: WSHandler; // Store WS logic at the leaf node
  children: Record<string, TrieNode> = {};
  paramKey?: string;
  wildcard?: TrieNode;
}