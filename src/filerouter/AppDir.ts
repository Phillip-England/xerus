import { VirtualAsset, VirtualFS } from "hoist";
import { AppFile, AppFileType } from "./AppFile";
import type { MiddlewareExport, RouteModule } from "./RouteModule";
import { MiddlwareStradegy } from "./MiddlewareStradegy";
import { Middleware } from "../server/Middleware";

function sortFilePaths(filepaths: string[]): string[] {
  return filepaths.sort((a, b) => {
    const depthA = a.split('/').length;
    const depthB = b.split('/').length;
    if (depthA !== depthB) {
      return depthA - depthB;
    }
    return a.localeCompare(b);
  });
}

export class AppDir {
  path: string;
  vfs: VirtualFS;
  appFiles: AppFile[];
  constructor(pth: string, vfs: VirtualFS, appFiles: AppFile[]) {
    this.path = pth;
    this.vfs = vfs;
    this.appFiles = appFiles;
  }
  static async load(pth: string): Promise<AppDir> {
    let vfs = await VirtualFS.load(pth);
    let appFiles = await AppDir.loadAppFiles(pth, vfs);
    let unsortedMwExports = await AppDir.loadUnsortedMwExports(appFiles);
    let dir = new AppDir(pth, vfs, appFiles);
    return dir;
  }
  static async loadUnsortedMwExports(appFiles: AppFile[]) {
    let mwRecord: Record<string, MiddlewareExport[]> = {
      'GET': [],
      'POST': [],
      'PUT': [],
      'DELETE': []
    }
    for (let i = 0; i < appFiles.length; i++) {
      let appFile = appFiles[i] as AppFile
      if (appFile.fileType != AppFileType.Route) {
        continue
      }
      let module = appFile.module as RouteModule
      mwRecord['GET']?.push()
    }
  }
  static async loadAppFiles(pth: string, vfs: VirtualFS): Promise<AppFile[]> {
    let files: AppFile[] = [];
    await vfs.iterAssets(async (asset: VirtualAsset, relPath: string) => {
      if (asset.isDir()) {
        return;
      }
      let routeFile = await AppFile.load(pth, asset.path);
      files.push(routeFile);
    });
    return files;
  }
  async iterAppFiles(
    callback: (appFile: AppFile) => void | Promise<void>,
  ): Promise<void> {
    for (let i = 0; i < this.appFiles.length; i++) {
      let routeFile = this.appFiles[i] as AppFile;
      await callback(routeFile);
    }
  }
  async loadMiddleware(method: string, endpoint: string): Promise<Middleware[]> {
    let mw: Middleware[] = []
    console.log('loading for: ', endpoint)
    await this.iterRouteAppFiles(async(routeFile: AppFile) => {
      if (!endpoint.startsWith(routeFile.endpoint)) {
        return
      }
      let includeIsloated = false;
      if (endpoint == routeFile.endpoint) {
        includeIsloated = true;
      }
      let module = routeFile.module as RouteModule
      if (method == 'GET') {
        for (let i = 0; i < module.getMiddleware.length; i++) {
          let mwExport = module.getMiddleware[i] as MiddlewareExport
          if (includeIsloated) {
            mw.push(mwExport.middleware)
          } else {
            if (mwExport.stradegy == MiddlwareStradegy.Cascade) {
              mw.push(mwExport.middleware)
            }
          }
        }
      }
    })
    return mw;
  }
  async iterRouteAppFiles(callback: (routeFile: AppFile) => void | Promise<void>) {
    let filePaths: string[] = []
    for (let i = 0; i < this.appFiles.length; i++) {
      let appFile = this.appFiles[i] as AppFile;
      if (appFile.fileType != AppFileType.Route) {
        continue
      }
      filePaths.push(appFile.filePath)
    }
    sortFilePaths(filePaths)
    for (let i = 0; i < filePaths.length; i++) {
      let filePath = filePaths[i]
        for (let j = 0; j < this.appFiles.length; j++) {
          let appFile = this.appFiles[j] as AppFile
          if (appFile.fileType != AppFileType.Route) {
            continue
          }
          if (appFile.filePath != filePath) {
            continue
          }
          await callback(appFile)
      }
    }
  }
}


