import path from 'path';
import { readdir } from 'fs/promises';
import { access, stat } from 'fs/promises';
import { join } from 'path';
import { rm } from 'fs/promises';
import type { BunFile } from 'bun';

export async function walkDir(
  dirPath: string, 
  callback: (path: string, isDirectory: boolean) => void | Promise<void>
) {
  await callback(dirPath, true);
  
  const files = await readdir(dirPath, { withFileTypes: true })
  for (const file of files) {
    const path = join(dirPath, file.name);
    if (file.isDirectory()) {
      await callback(path, true);
      await walkDir(path, callback);
    } else {
      await callback(path, false);
    }
  }
}

export async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function dirExists(path: string): Promise<boolean> {
  try {
    const stats = await stat(path);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

export async function rmdirIfExists(path: string) {
  if (await dirExists(path)) {
    await rm(path);
  }
}

export async function loadFile(...pathParts: string[]): Promise<BunFile> {
  let p = path.join(...pathParts)
  let file = Bun.file(p);
  return file
}