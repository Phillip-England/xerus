import path from "path";
import { AppDir } from "./AppDir";
import { ServerManager } from "./ServerManager";
import type { FileRouterOpts } from "./FileRouterOpts";


export class FileRouter {
  opts: FileRouterOpts;
  serverManager: ServerManager;
  appDir: AppDir;
  constructor(opts: FileRouterOpts, serverManager: ServerManager, appDir: AppDir) {
    this.opts = opts;
    this.serverManager = serverManager;
    this.appDir = appDir;
  }
  static async new(opts: FileRouterOpts) {
    let appDir = await AppDir.load(path.join(opts.src));
    let serverManager = await ServerManager.new(appDir);
    let router = new FileRouter(opts, serverManager, appDir);
    return router;
  }
  async listen() {
    await this.serverManager.listen(this.opts.port);
  }
}

