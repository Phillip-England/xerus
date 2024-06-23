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

When creating a new instance of Xerus, a `Router` is mapped to the key `'/'` at `this.routers`:
```ts
export class Xerus {

    routers: {[key: string]: Router}
    //...

    constructor() {
        this.routers = {
            "/": new Router('/') // generic router created
        }
        //...
    }
    //...
}
```

`Xerus` has methods for each HTTP request method type:
```ts
export class Xerus {
    //...
    get(path: string, handler: HandlerFunc) {
        this.routers['/'].get(path, handler)
    }

    post(path: string, handler: HandlerFunc) {
        this.routers['/'].post(path, handler)
    }

    patch(path: string, handler: HandlerFunc) {
        this.routers['/'].patch(path, handler)
    }

    update(path: string, handler: HandlerFunc) {
        this.routers['/'].update(path, handler)
    }

    delete(path: string, handler: HandlerFunc) {
        this.routers['/'].delete(path, handler)
    }
    //...
}
```

Notice, we are really just using the router instantiated in `Xerus`'s constructor:
```ts
export class Xerus {
        routers: {[key: string]: Router}
    //...

    constructor() {
        this.routers = {
            "/": new Router('/') // this.routers['/'] created
        }
        //...
    }
    //...
    get(path: string, handler: HandlerFunc) {
        this.routers['/'].get(path, handler) // using the .get() method of this.routers['/']
    }
    //...
}
```