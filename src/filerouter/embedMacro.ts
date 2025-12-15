// embed-dir.ts
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

export function embedMacro(dirPath: string) {
  const files: Record<string, string> = {};
  
  // Helper to walk sync (macros must be sync or return a Promise that resolves to a value)
  function walk(currentDir: string) {
    const entries = readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else {
        // Read file content as text (or base64 if binary)
        // This 'embeds' the content directly into the JS bundle as a string
        files[fullPath] = readFileSync(fullPath, "utf-8");
      }
    }
  }

  walk(dirPath);
  return files;
}