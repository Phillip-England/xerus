// --- START FILE: src/std/Template.ts ---
import type { HTTPContext } from "../HTTPContext";
import { TemplateStore } from "../TemplateStore";

/**
 * Read a template from the app-registered TemplateStore.
 *
 * Usage:
 *   const html = template(c, "index.html");
 *   const html = template(c, "./index.html");
 *   const html = template(c, "/sub/dir/page.html");
 */
export function template(c: HTTPContext, relPath: string): string {
  const store = c.global(TemplateStore);
  return store.text(relPath);
}

/**
 * If you ever want bytes (e.g. for binary templates / precompressed / etc)
 */
export function templateBytes(c: HTTPContext, relPath: string): Uint8Array {
  const store = c.global(TemplateStore);
  return store.bytes(relPath);
}
// --- END FILE: src/std/Template.ts ---
