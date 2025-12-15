import { Cmd, getArgByPos, hasFlag } from '../grub/entrypoint'
import path from 'path'
import { mkdir } from 'fs/promises'
import { rm } from 'fs/promises'
import { $ } from 'bun'


export async function cmdInit(args: string[]) {
  let shBunVersion = await $`bun -v`.quiet()
  let bunVersion = shBunVersion.stdout.toString()
  if (!bunVersion.startsWith("1.")) {
    throw new Error('bun is not installed')
  }
  let appName = getArgByPos(3);
  if (appName == '') {
    throw new Error('missing <DIRNAME> in xerus init <DIRNAME>')
  }
  let appAbsolutePath = path.join(process.cwd(), appName)
  let xerusDir = await XerusDir.new(appAbsolutePath, hasFlag('--reset'))
}

class XerusDir {
  absolutePath: string
  hasReset: boolean
  constructor(absolutePath: string, hasReset: boolean) {
    this.absolutePath = absolutePath
    this.hasReset = hasReset
  }
  static async new(absolutePath: string, hasReset: boolean): Promise<XerusDir> {
    let xerusDir = new XerusDir(absolutePath, hasReset)
    if (xerusDir.hasReset) {
      await rm(absolutePath, {
        recursive: true,
        force: true,
      })
    }
    let rootDir = await mkdir(absolutePath)
    let makeFile = await Bun.file(path.join(absolutePath, "Makefile")).write(`dev:\n\tbun run --hot index.ts\n\ntw:\n\ttailwindcss -i './static/input.css' -o './static/output.css'`)
    let appDir = await mkdir(path.join(absolutePath, "app"))
    let appInitFile = await Bun.file(path.join(absolutePath, "app", "+init.tsx")).write(appInitText)
    let appHomeRouteFile = await Bun.file(path.join(absolutePath, "app", "+route.tsx")).write(appHomeRouteText)
    let srcDir = await mkdir(path.join(absolutePath, "src"))
    let componentsFile = await Bun.file(path.join(absolutePath, "src", "components.tsx")).write(componentsFileText)
    let staticDir = await mkdir(path.join(absolutePath, "static"))
    let inputCssFile = await Bun.file(path.join(absolutePath, "static", "input.css")).write(`@import 'tailwindcss';`)
    let initScript = (await $`cd ${absolutePath}; bun init -y; bun add github.com:phillip-england/xerus; make tw; bun i --save-dev @types/react`.quiet()).stdout.toString()
    let indexTsFile = await Bun.file(path.join(absolutePath, "index.ts")).write(`import { FileRouter } from "xerus";
import path from "path";

let router = await FileRouter.new({
  "src": path.join(process.cwd(), "app"),
  "port": 8080,
});

await router.listen()
`)
    return xerusDir
  }
}

const componentsFileText = `import type { JSX } from "react";

export const BaseLayout = (props: {
  title: string,
  children: JSX.Element,
}) => {
  return (
    <html>
      <head>
        <link rel='stylesheet' href='/static/output.css' ></link>
        <title>{props.title}</title>
      </head>
      <body>
        {props.children}
      </body>
    </html>
  )
}`


const appInitText = `import { InitModule, Xerus, logger } from 'xerus'

let module = new InitModule();

module.init(async (app: Xerus) => {
  app.use(logger);
  app.static("static");
});

export default module;`

const appHomeRouteText = `import { RouteModule, HTTPContext } from 'xerus'
import { BaseLayout } from '../src/components.tsx'

let module = new RouteModule();

module.get(async (c: HTTPContext) => {
  return c.jsx(
    <BaseLayout title="Home Page">
      <h1>Home Page!</h1>
    </BaseLayout>,
  );
});

export default module;`