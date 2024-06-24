import { Xerus } from "./src/Xerus"
import { XerusMw } from "./src/XerusMw"
import { ServiceFunc } from "./src/ServiceFunc"
import { readdir } from 'node:fs/promises'
import { Dirent } from 'node:fs'
import { HandleFile } from "./src/HandleFile"

const app = new Xerus()

app.global(XerusMw.serveStaticFiles)
app.global(XerusMw.serveFavicon)

const fileBasedRoutingService: ServiceFunc = async (app: Xerus) => {
    try {
        const systemFiles: Dirent[] = await readdir('./app', {
            withFileTypes: true,
            recursive: true,
        })
        const files: HandleFile[] = []
        for (const file of systemFiles) {
            if (file.isFile()) {
                files.push(new HandleFile(file))
            }
        }
        for (const file of files) {
            const module = await import(file.absolutePath)
            if (module.Handle) {
                const handle = module.Handle
                if (handle.get) {
                    app.get(file.endpointPath, handle.get)
                }
                if (handle.post) {
                    app.post(file.endpointPath, handle.post)
                }
                if (handle.put) {
                    app.put(file.endpointPath, handle.put)
                }
                if (handle.delete) {
                    app.delete(file.endpointPath, handle.delete)
                }
            }
        }
    } catch (e) {
        console.log('./app directory does not exist')
        process.exit(1)
    }
}

await fileBasedRoutingService(app)





app.run(8080)