import { AppFile, AppFileType } from "./AppFile";
import type { MiddlewareExport, RouteModule } from "./RouteModule";
import { MiddlwareStradegy } from "./MiddlewareStradegy";
import { Middleware } from "../server/Middleware";
import { readdir } from "fs/promises";
import type { Dirent } from "fs";
import path from 'path'

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
  appFiles: AppFile[];
  constructor(pth: string, appFiles: AppFile[]) {
    this.path = pth;
    this.appFiles = appFiles;
  }
  static async load(pth: string): Promise<AppDir> {
    let appFiles = await AppDir.loadAppFiles(pth);
    let dir = new AppDir(pth, appFiles);
    return dir;
  }
  static async loadAppFiles(pth: string): Promise<AppFile[]> {
    let files: AppFile[] = [];
    let entries = await readdir(pth, {
      recursive: true,
      withFileTypes: true,
    })
    for (let i = 0; i < entries.length; i++) {
      let entry = entries[i] as Dirent<string>
      if (entry.isDirectory()) {
        continue
      }
      let assetPath = path.join(entry.parentPath, entry.name)
      let appFile = await AppFile.load(pth, assetPath)
      files.push(appFile)
    }
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


