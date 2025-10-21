import type { AppDir } from "./AppDir";
import {  type RouteModule } from "./RouteModule";
import type { InitModule } from "./InitModule";
import { Xerus } from "../server/Xerus";
import type { HTTPHandlerFunc } from "../server/HTTPHandlerFunc";


export class ServerManager {
  server: Xerus
  constructor(app: Xerus) {
    this.server = app;
  }
  static async new(appDir: AppDir): Promise<ServerManager> {
    let server = await ServerManager.initServer(appDir)
    await ServerManager.registerRoutes(server, appDir)
    let app = new ServerManager(server)
    return app
  }
  static async initServer(appDir: AppDir): Promise<Xerus> {
    let server = new Xerus()
    await appDir.iterAppFiles(async (appFile) => {
      let module = appFile.module as InitModule
      if (module.initFunc) {
        await module.initFunc(server)
      }
    })
    return server
  }
  static async registerRoutes(server: Xerus, appDir: AppDir) {
    await appDir.iterRouteAppFiles(async (appFile) => {
      let module = appFile.module as RouteModule
      if (module.getFunc) {
        let mw = await appDir.loadMiddleware('GET', appFile.endpoint)
        let getFunc = module.getFunc as HTTPHandlerFunc
        server.get(appFile.endpoint, getFunc, ...mw)
      }
      if (module.postFunc) {
        let mw = await appDir.loadMiddleware('POST', appFile.endpoint)
        let postFunc = module.postFunc as HTTPHandlerFunc
        server.post(appFile.endpoint, postFunc, ...mw)
      }
      if (module.putFunc) {
        let mw = await appDir.loadMiddleware('PUT', appFile.endpoint)
        let putFunc = module.putFunc as HTTPHandlerFunc
        server.put(appFile.endpoint, putFunc, ...mw)
      }
      if (module.deleteFunc) {
        let mw = await appDir.loadMiddleware('DELETE', appFile.endpoint)
        let deleteFunc = module.deleteFunc as HTTPHandlerFunc
        server.delete(appFile.endpoint, deleteFunc, ...mw)        
      }
    }) 
  }
  async listen(port: number) {
    await this.server.listen(port)
  }
}