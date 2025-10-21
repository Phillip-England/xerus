import path from "path";
import { MiddlewareExport, RouteModule } from "./RouteModule";
import { InitModule } from "./InitModule";

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
  static async load(appDirPath: string, filePath: string): Promise<AppFile> {
    let [appModule, fileType] = await this.loadFileType(appDirPath, filePath);
    let parentDirPath = path.dirname(filePath);
    let endpoint = await AppFile.loadEndpoint(
      appDirPath,
      parentDirPath,
    );
    appModule.endpoint = endpoint
    let appFile = new AppFile(
      appDirPath,
      filePath,
      endpoint,
      appModule,
      fileType,
    );
    return appFile;
  }
  static async loadFileType(
    appDirPath: string,
    filePath: string,
  ): Promise<[AppModule, AppFileType]> {
    let fileName = path.basename(filePath);
    let ext = path.extname(fileName);
    if (ext != ".tsx") {
      throw new Error(
        `INVALID APP FILE: only .tsx files allowed, located ${filePath}`,
      );
    }
    let module = await import(filePath);
    if (!module.default) {
      throw new Error(
        `INVALID APP FILE: missing default export at ${filePath}`,
      );
    }
    switch (fileName) {
      case "+route.tsx": {
        if (module.default instanceof RouteModule) {
          return [module.default as RouteModule, AppFileType.Route];
        }
        break;
      }
      case "+init.tsx": {
        if (filePath != path.join(appDirPath, "+init.tsx")) {
          break;
        }
        if (module.default instanceof InitModule) {
          return [module.default as InitModule, AppFileType.Init];
        }
        break;
      }
    }
    throw new Error(
      `INVALID APP FILE: the following file did not match the spec ${filePath}`,
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
