import { Xerus } from "./src/Xerus"
import { XerusMw } from "./src/export"
import { FileBasedRouter } from "./src/FileBasedRouter"

// await Bun.build({
//     entrypoints: ["./client/index.ts"],
//     outdir: "./static",
//     target: "browser",
// })

const app = new Xerus()

app.global(XerusMw.serveStaticFiles)
app.global(XerusMw.serveFavicon)

const router = new FileBasedRouter(app)
await router.mount('./app')

await app.run(8080)