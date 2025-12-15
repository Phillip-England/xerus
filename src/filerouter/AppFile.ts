import path from "path";
import { RouteModule } from "./RouteModule";
import { InitModule } from "./InitModule";
import type { FileRouterOpts } from "./FileRouterOpts";
import { rm } from "fs/promises";

export type AppModule = RouteModule | InitModule;

export enum AppFileType {
  Init,
  Route,
}

export class AppFile {
  routesDirPath: string;
  endpoint: string;
  filePath: string;
  module: AppModule;
  fileType: AppFileType;
  constructor(
    routesDirPath: string,
    filePath: string,
    endpoint: string,
    module: AppModule,
    fileType: AppFileType,
  ) {
    this.routesDirPath = routesDirPath;
    this.endpoint = endpoint;
    this.filePath = filePath;
    this.module = module;
    this.fileType = fileType;
  }
  static async load(opts: FileRouterOpts, targetPath: string): Promise<AppFile> {
    let [appModule, fileType] = await this.loadFileType(opts, targetPath);
    let parentDirPath = path.dirname(targetPath);
    let endpoint = await AppFile.loadEndpoint(
      opts.src,
      parentDirPath,
    );
    appModule.endpoint = endpoint
    let appFile = new AppFile(
      opts.src,
      targetPath,
      endpoint,
      appModule,
      fileType,
    );
    return appFile;
  }
  static async loadFileType(
    opts: FileRouterOpts,
    targetPath: string,
  ): Promise<[AppModule, AppFileType]> {
    let fileName = path.basename(targetPath);
    let ext = path.extname(fileName);
    if (ext != ".tsx") {
      throw new Error(
        `INVALID APP FILE: only .tsx files allowed, located ${targetPath}`,
      );
    }
    // let tmpFilePath = path.join(opts.tmpDir, fileName)
    // let tmpModuleFile = await Bun.write(tmpFilePath, embeddedFileContet)
    let module = await import(targetPath);
    if (!module.default) {
      throw new Error(
        `INVALID APP FILE: missing default export at ${targetPath}`,
      );
    }
    switch (fileName) {
      case "+route.tsx": {
        if (module.default instanceof RouteModule) {
          return [module.default as RouteModule, AppFileType.Route];
        }
        break
      }
      case "+init.tsx": {
        if (module.default instanceof InitModule) {
          return [module.default as InitModule, AppFileType.Init];
        }
        break
      }
    }
    throw new Error(
      `INVALID APP FILE: the following file did not match the spec ${targetPath}`,
    );
  }
  static async loadEndpoint(
    appDirPath: string,
    parentDirPath: string,
  ): Promise<string> {
    let rel = path.relative(appDirPath, parentDirPath);
    let endpoint: string = "/";
    if (rel != "") {
      endpoint = "/" + rel;
    }
    return endpoint;
  }
}
