import { Cmd, getArgByPos, Grub } from 'grub'
import path from 'path'
import { dirExists, fileExists } from './src/floss'
import { mkdir } from 'fs/promises'
import { write } from 'console'
import { writeFile } from 'fs/promises'

// server
export * from './src/server/BodyType'
export * from './src/server/CookieOptions'
export * from './src/server/HTTPContext'
export * from './src/server/HTTPHandler'
export * from './src/server/HTTPHandlerFunc'
export * from './src/server/Middleware'
export * from './src/server/MiddlewareFn'
export * from './src/server/MiddlewareNextFn'
export * from './src/server/MutResponse'
export * from './src/server/RouteGroup'
export * from './src/server/SystemErr'
export * from './src/server/SystemErrCode'
export * from './src/server/SystemErrRecord'
export * from './src/server/TrieNode'
export * from './src/server/WSCloseFunc'
export * from './src/server/WSContext'
export * from './src/server/WSDrainFunc'
export * from './src/server/WSMessageFunc'
export * from './src/server/WSOnConnect'
export * from './src/server/WSOpenFunc'
export * from './src/server/Xerus'

// filerouter
export * from './src/filerouter/AppDir'
export * from './src/filerouter/AppFile'
export * from './src/filerouter/InitModule'
export * from './src/filerouter/MiddlewareStradegy'
export * from './src/filerouter/RouteModule'
export * from './src/filerouter/ServerManager'
export * from './src/filerouter/FileRouter'
export * from './src/filerouter/FileRouterOpts'

export let help = new Cmd('help');
help.setAsDefault();
help.setOperation(async () => {
  console.log('xerus - minimal web servers')
  console.log('xerus init ./someDir')
})

export let init = new Cmd('init');
init.setOperation(async () => {
  let appPath = getArgByPos(3);
  let appAbsolutePath = path.join(process.cwd(), appPath)
  if (await dirExists(appAbsolutePath)) {
    throw new Error(`path ${appAbsolutePath} already exists`)
  }
  let initFilePath = path.join(appAbsolutePath, "+init.tsx")
  if (await fileExists(initFilePath)) {
    throw new Error(`path ${initFilePath} already exists`)
  }
  let homeRoutePath = path.join(appAbsolutePath, "+route.tsx")
  if (await fileExists(homeRoutePath)) {
    throw new Error(`path ${homeRoutePath} already exists`)
  }
  await mkdir(appAbsolutePath)
  await writeFile(initFilePath, "")
  await writeFile(homeRoutePath, "")
  console.log(appAbsolutePath)
})

let cli = new Grub(help, init)
try {
  await cli.run();
} catch (err: any) {
  console.error(err.message);
}