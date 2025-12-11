import { Cmd, getArgByPos, hasFlag } from '../grub/entrypoint'
import path from 'path'
import { dirExists, fileExists } from '../floss'
import { mkdir } from 'fs/promises'
import { writeFile } from 'fs/promises'
import { rmdir } from 'fs/promises'

export let init = new Cmd('init');
init.setOperation(async () => {
  let appPath = getArgByPos(3);
  if (appPath == '') {
    throw new Error('missing <DIRPATH> in xerus init <DIRPATH>')
  }
  let appAbsolutePath = path.join(process.cwd(), appPath)
  if (hasFlag('--reset')) {
    await rmdir(appAbsolutePath, {
      recursive: true,
    })
  }
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
  await writeFile(initFilePath, `import { InitModule, Xerus, logger } from 'xerus'

let module = new InitModule();

module.init(async (app: Xerus) => {
  app.use(logger);
  app.static("static");
});

export default module;`)
  await writeFile(homeRoutePath, `import { RouteModule, HTTPContext } from 'xerus'

let module = new RouteModule();

module.get(async (c: HTTPContext) => {
  return c.jsx(
    <h1>Hello, World!</h1>
  )
});

export default module;`)
})