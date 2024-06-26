import { Xerus } from "./src/Xerus"
import { XerusMw } from "./src/export"
import { FileBasedRouter } from "./src/FileBasedRouter"

const app = new Xerus()

app.global(XerusMw.serveStaticFiles)
app.global(XerusMw.serveFavicon)

const router = new FileBasedRouter(app)
await router.mount('./app')

app.run(8080)