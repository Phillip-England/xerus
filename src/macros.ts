import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

// Changed return type to support Buffer
export function embedDir(
  absPath: string,
): Record<string, { content: string | Buffer; type: string }> {
  const files: Record<string, { content: string | Buffer; type: string }> = {};

  function walk(currentDir: string) {
    const entries = readdirSync(currentDir);
    for (const entry of entries) {
      const fullPath = join(currentDir, entry);
      const stats = statSync(fullPath);

      if (stats.isDirectory()) {
        walk(fullPath);
      } else {
        const relPath = "/" + relative(absPath, fullPath);
        
        // FIX: Removed "utf-8". This now returns a Buffer for binary files.
        const content = readFileSync(fullPath); 
        
        const type = Bun.file(fullPath).type; // Get MIME type

        files[relPath] = { content, type };
      }
    }
  }

  walk(absPath);
  return files;
}