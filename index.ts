import { Xerus } from "./src/Xerus"
import { FileBasedRouter } from "./src/FileBasedRouter"

const app = new Xerus()

const router = new FileBasedRouter(app)
await router.mount('./app')

await app.run(8080)