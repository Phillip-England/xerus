import { Xerus } from "./src/Xerus";
import { type AppContext } from "./src/types";
import { setBody, setHeader } from "./src/http";

const app: Xerus = new Xerus()

app.get('/', async (ctx: AppContext) => {
    setBody(ctx, '<p1>home</p1>')
})

app.use(async (ctx: AppContext) => {
    setHeader(ctx, 'Content-Type', 'text/html')
})

let adminRouter = app.spawnRouter('/admin')

adminRouter.get('/', async (ctx: AppContext) => {
    setBody(ctx, '<p1>admin home</p1>')
})

app.mountRouters(adminRouter)

app.run(8080)



