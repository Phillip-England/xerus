import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * Xerus Macro: embedDir
 * * Reads a directory at compile-time and returns a dictionary of files.
 * The content is returned as number[] (for binaries) or strings so that
 * Bun's macro system can serialize it into the AST.
 */
export function embedDir(
  absPath: string,
): Record<string, { content: string | number[]; type: string }> {
  const files: Record<string, { content: string | number[]; type: string }> =
    {};

  function walk(currentDir: string) {
    const entries = readdirSync(currentDir);
    for (const entry of entries) {
      const fullPath = join(currentDir, entry);
      const stats = statSync(fullPath);

      if (stats.isDirectory()) {
        walk(fullPath);
      } else {
        // Create the relative key (e.g., "/css/style.css")
        const relPath = "/" + relative(absPath, fullPath);

        // 1. Read file as Buffer
        const buffer = readFileSync(fullPath);

        // 2. Determine mime type using Bun's API
        const type = Bun.file(fullPath).type || "application/octet-stream";

        // 3. Convert Buffer to number[]
        // Bun Macros cannot return raw Buffers/Uint8Arrays.
        // We must convert to a plain array to allow AST serialization.
        const content = Array.from(buffer);

        files[relPath] = { content, type };
      }
    }
  }

  walk(absPath);
  return files;
}
