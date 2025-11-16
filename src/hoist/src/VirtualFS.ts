import { AssetType, VirtualAsset } from "./VirtualAsset";
import { walkDir } from "../../floss";
import { rm, mkdir } from "fs/promises";
import path from 'path';

export class VirtualFS {
  rootPath: string;
  assets: Record<string, VirtualAsset>;

  constructor(rootPath: string, VirtualAssets: Record<string, VirtualAsset>) {
    this.rootPath = path.resolve(rootPath);
    // Normalize all asset keys
    this.assets = {};
    for (const [key, value] of Object.entries(VirtualAssets)) {
      const normalizedKey = this.normalizePath(key);
      this.assets[normalizedKey] = value;
    }
  }

  private normalizePath(inputPath: string): string {
    const relative = path.relative(process.cwd(), path.resolve(inputPath));
    const normalized = relative.startsWith('.') ? relative : `./${relative}`;
    return normalized.split(path.sep).join('/');
  }

  static async overwrite(rootPath: string, VirtualAssets: Record<string, VirtualAsset>): Promise<VirtualFS> {
    const resolvedPath = path.resolve(rootPath);
    await rm(resolvedPath, { recursive: true, force: true });
    return await VirtualFS.create(resolvedPath, VirtualAssets);
  }

  static async create(rootPath: string, VirtualAssets: Record<string, VirtualAsset>): Promise<VirtualFS> {
    const fs = new VirtualFS(rootPath, VirtualAssets);
    await mkdir(fs.rootPath, { recursive: true });
    for (const [relativePath, asset] of Object.entries(fs.assets)) {
      if (asset.assetType === AssetType.RootDir) {
        continue;
      }
      const fullPath = path.join(process.cwd(), relativePath);
      if (asset.isDir()) {
        await mkdir(fullPath, { recursive: true });
      } else {
        await mkdir(path.dirname(fullPath), { recursive: true });
        await Bun.write(fullPath, asset.text);
      }
      asset.setPath(fullPath)
    }
    return fs;
  }

  static async load(rootPath: string): Promise<VirtualFS> {
    const resolvedRoot = path.resolve(rootPath);
    const assets: Record<string, VirtualAsset> = {};
    await walkDir(resolvedRoot, async (fullPath, isDir) => {
      const relativePath = convertToRelativePath(fullPath, process.cwd());
      if (isDir) {
        let asset: VirtualAsset;
        if (path.resolve(fullPath) === path.resolve(resolvedRoot)) {
          asset = VirtualAsset.rootDir()
        } else {
          asset = VirtualAsset.dir()
        }
        asset.setPath(fullPath)
        assets[relativePath] = asset;
        return;
      }
      const file = Bun.file(fullPath);
      const text = await file.text();
      let asset = VirtualAsset.file(text)
      asset.setPath(fullPath)
      assets[relativePath] = asset;
    });

    return new VirtualFS(resolvedRoot, assets);
  }

  read(filePath: string): string {
    const normalizedPath = this.normalizePath(filePath);
    const asset = this.assets[normalizedPath];
    if (!asset) {
      throw new Error(`No asset found for ${filePath}`);
    }
    if (asset.isDir()) {
      throw new Error(`Cannot read directory: ${filePath}`);
    }
    return asset.text;
  }

  write(filePath: string, content: string) {
    const normalizedPath = this.normalizePath(filePath);
    const asset = this.assets[normalizedPath];
    if (!asset) {
      throw new Error(`No asset found for ${filePath}`);
    }
    if (asset.isDir()) {
      throw new Error(`Cannot write to directory: ${filePath}`);
    }
    asset.text = content;
  }

  async sync(): Promise<void> {
    for (const [relativePath, asset] of Object.entries(this.assets)) {
      if (asset.assetType != AssetType.File) {
        continue
      }
      await asset.save()
    }
  }

  async iterAssets(callback: (asset: VirtualAsset, relativePath: string) => Promise<void> | void): Promise<void> {
  for (const [relativePath, asset] of Object.entries(this.assets)) {
    await callback(asset, relativePath);
  }
}

}

function convertToRelativePath(absolutePath: string, basePath: string): string {
  const relative = path.relative(basePath, absolutePath);
  const withDot = relative.startsWith('.') ? relative : `./${relative}`;
  return withDot.split(path.sep).join('/');
}