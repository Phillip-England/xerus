
function searchObjectForDynamicPath(obj, path) {
    for (const key in obj) {
        if (!key.includes("{") && !key.includes("}")) {
            continue
        }
        let pathParts = path.split("/")
        let keyParts = key.split('/')
        if (pathParts.length != keyParts.length) {
            continue
        }
        let newPathParts = []
        let noBrackets = keyParts.filter((str, i) => {
            if (str.includes("{") && str.includes("}")) {
                return false
            }
            newPathParts.push(pathParts[i])
            return true
        })
        for (let i=0; i < newPathParts.length; i++) {
            let k = noBrackets[i]
            let p = newPathParts[i]
            if (k != p) {
                break
            }
            if (i == newPathParts.length -1) {
                return key
            }
        }
    } 
    return ""
}

class XerusResponse {
    constructor() {
        this.headers = {}
        this.body = ''
        this.status = 200
    }
}

class XerusContext {

    constructor(req) {
        this.req = req
        this.res = new XerusResponse()
    }

    respond() {
        return new Response(this.res.body, {
            headers: this.res.headers,
            status: this.res.status
        })
    }

    setHeader(key, value) {
        this.res.headers[key] = value
    }

}


export class Xerus {

    constructor() {
        this.routes = {}
        this.prefixMiddleware = {}
        this.notFound = null
    }

    setNotFound(fn) {
        this.notFound = fn
    }

    use(pathPrefix, ...middleware) {
        this.prefixMiddleware[pathPrefix] = middleware
    }

    at(path, handler, ...middleware) {
        let combinedMiddleware = [...(this.prefixMiddleware['*'] || [])];
        for (const key in this.prefixMiddleware) {
            if (path.startsWith(key)) {
                combinedMiddleware.push(...this.prefixMiddleware[key]);
                break;
            }
        }
        combinedMiddleware.push(...middleware);
        const wrappedHandler = async (c) => {
            let index = 0;
            const executeMiddleware = async () => {
                if (index < combinedMiddleware.length) {
                    await combinedMiddleware[index++](c, executeMiddleware);
                } else {
                    await handler(c);
                }
            };
            await executeMiddleware();
        };
        this.routes[path] = wrappedHandler;
    }

    async handleRequest(req) {
        let path = new URL(req.url).pathname
        let method = req.method
        let methodPath = `${method} ${path}`
        let handler = this.routes[methodPath]
        if (!handler) {
            let key = searchObjectForDynamicPath(this.routes, methodPath)
            let handler = this.routes[key]
            if (!handler) {
                if (this.notFound) {
                    let c = new XerusContext(req)
                    await this.notFound(c)
                    return c.respond()
                }
                return new Response('404 not found', { status: 404 })
            }
        }
        let c = new XerusContext(req)
        await handler(c)
        return c.respond()
    }
    
    
    
}

export async function logger(c, next) {
    let startTime = process.hrtime()
    await next()
    let endTime = process.hrtime(startTime)
    let totalTime = (endTime[0] * 1e3 + endTime[1] / 1e6)
    console.log(`[${c.req.method}][${new URL(c.req.url).pathname}][${totalTime.toFixed(3)}ms]`)
}

export async function contentHTML(c, next) {
    c.setHeader('Content-Type', 'text/html')
    await next()
}

let app = new Xerus()

app.use('*', contentHTML, logger)

app.setNotFound(async (c) => {
    c.res.body = '<h1>404 Not Found</h1>'
    c.setHeader('Content-Type', 'text/html')
})

app.at('GET /', async (c) => {
    c.res.body = `<h1>Hello, World!</h1>`
})

Bun.serve({
    port: 8080,
    async fetch(req) {
        return await app.handleRequest(req)
    },
});
