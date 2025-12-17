import { HTTPHandler } from "./HTTPHandler";

export class TrieNode {
  handlers: Record<string, HTTPHandler> = {}; 
  children: Record<string, TrieNode> = {}; 
  paramKey?: string;
  wildcard?: TrieNode;
}

