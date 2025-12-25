// --- START FILE: src/TemplateStore.ts ---
import { SystemErr } from "./SystemErr";
import { SystemErrCode } from "./SystemErrCode";
import * as path from "node:path";

export type EmbeddedFile = {
  content: string | Buffer | Uint8Array | number[];
  type: string;
};

export class TemplateStore {
  private files: Record<string, EmbeddedFile> = {};

  constructor(initial?: Record<string, EmbeddedFile>) {
    if (initial) this.add(initial);
  }

  add(more: Record<string, EmbeddedFile>) {
    // Merge (later wins)
    for (const [k, v] of Object.entries(more)) {
      this.files[k] = v;
    }
  }

  private normalizeRel(relPath: string): string {
    // Accept: "index.html", "./index.html", "/index.html"
    // Deny traversal: "../x", "a/../../b"
    let p = (relPath ?? "").trim();
    if (!p) p = "index.html";

    p = p.replace(/\\/g, "/");

    // strip leading "./"
    while (p.startsWith("./")) p = p.slice(2);

    // make it relative (no leading slash) then normalize as posix
    p = p.replace(/^\/+/, "");
    const norm = path.posix.normalize(p);

    // normalize can produce "." for empty
    const finalRel = norm === "." ? "index.html" : norm;

    // traversal check
    if (finalRel === ".." || finalRel.startsWith("../") || finalRel.includes("/../")) {
      throw new SystemErr(SystemErrCode.FILE_NOT_FOUND, "Access Denied");
    }

    return "/" + finalRel;
  }

  has(relPath: string): boolean {
    const key = this.normalizeRel(relPath);
    return !!this.files[key];
  }

  bytes(relPath: string): Uint8Array {
    const key = this.normalizeRel(relPath);
    const file = this.files[key];
    if (!file) {
      throw new SystemErr(SystemErrCode.FILE_NOT_FOUND, `Template ${key} not found`);
    }

    const body = file.content;
    if (typeof body === "string") return new TextEncoder().encode(body);
    if (body instanceof Uint8Array) return body;
    if (typeof Buffer !== "undefined" && body instanceof Buffer) return new Uint8Array(body);
    if (Array.isArray(body)) return new Uint8Array(body);
    return new Uint8Array(body as any);
  }

  text(relPath: string): string {
    const u8 = this.bytes(relPath);
    return new TextDecoder().decode(u8);
  }

  // Handy if you want to branch by mime later
  type(relPath: string): string {
    const key = this.normalizeRel(relPath);
    const file = this.files[key];
    if (!file) {
      throw new SystemErr(SystemErrCode.FILE_NOT_FOUND, `Template ${key} not found`);
    }
    return file.type;
  }
}
// --- END FILE: src/TemplateStore.ts ---
