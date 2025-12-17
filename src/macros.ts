import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

export function embedDir(absPath: string): Record<string, { content: string; type: string }> {
  const files: Record<string, { content: string; type: string }> = {};

  function walk(currentDir: string) {
    const entries = readdirSync(currentDir);
    for (const entry of entries) {
      const fullPath = join(currentDir, entry);
      const stats = statSync(fullPath);

      if (stats.isDirectory()) {
        walk(fullPath);
      } else {
        const relPath = "/" + relative(absPath, fullPath);
        const content = readFileSync(fullPath, "utf-8");
        const type = Bun.file(fullPath).type; // Get MIME type
        
        files[relPath] = { content, type };
      }
    }
  }

  walk(absPath);
  return files;
}