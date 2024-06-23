# Xerus

An Express-like framework for Bun.

## Installation

With bun 1.1.12 or greater installed, run:
```bash
bun create phillip-england/xerus <app-name>
```

## Quickstart

Hello world example:
```ts
import { Xerus, setBody, setHeader, type AppContext } from "./xerus/package"

const app = new Xerus()

app.use(async (ctx: AppContext) => {
	setHeader(ctx, "Content-Type", "text/html")
})

app.get("/", async (ctx: AppContext) => {
	setBody(ctx, "<h1>Hello, World!</h1>")
})

app.run(8080)
```

## Type-System
Xerus is built off of a few core types and classes. Here are their definitions and roles.

## Xerus

`Xerus` is a class which serves as a container for all `Router`'s in your app. `Router`'s are stashed inside an object at, `this.routers`.

When creating a new instance of Xerus, a `Router` is mapped to the key `'/'` at `this.routers`:
```ts
export class Xerus {

    routers: {[key: string]: Router}
    // ...other properties

    constructor() {
        this.routers = {
            "/": new Router('/') // generic router created
        }
        // ...other Xerus init processes
    }

    //...Xerus methods
```

You can use the generic router
Let's take a look at `Xerus.get`:
```ts
export class Xerus {
    //...
    get(path: string, handler: HandlerFunc) {
        this.routers['/'].get(path, handler)
    }
}
```