import path from 'path';
import { extname } from 'path';

export enum AssetType {
  Dir,
  File,
  RootDir,
}
export class VirtualAsset {
  assetType: AssetType;
  text: string;
  isRoot: boolean;
  path: string;
  filename: string;
  dirname: string;
  ext: string;
  constructor(diskType: AssetType, text: string) {
    this.assetType = diskType;
    this.text = text;
    this.isRoot = false;
    this.path = '';
    this.filename = '';
    this.dirname = '';
    this.ext = '';
  }
  static dir(): VirtualAsset {
    let record = new VirtualAsset(AssetType.Dir, '')
    return record;
  }
  static file(content: string): VirtualAsset {
    let record = new VirtualAsset(AssetType.File, content)
    return record;
  }
  isDir(): boolean {
    return this.assetType == AssetType.Dir || this.assetType == AssetType.RootDir;
  }
  static rootDir(): VirtualAsset {
    let asset = new VirtualAsset(AssetType.RootDir, '')
    return asset
  }
  setPath(p: string) {
    this.path = p;
    this.ext = extname(p)
    this.dirname = path.dirname(p);
    this.filename = path.basename(p);
  }
  async save() {
    if (this.assetType != AssetType.File) {
      return
    }
    await Bun.write(this.path, this.text);
  }
}