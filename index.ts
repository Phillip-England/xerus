import { Xerus, setBody, setHeader, type AppContext } from "./src/package"

const app = new Xerus()

app.use(async (ctx: AppContext) => {
	setHeader(ctx, "Content-Type", "text/html")
})

app.get("/", async (ctx: AppContext) => {
	setBody(ctx, "<h1>Hello, World!</h1>")
})

app.run(8080)