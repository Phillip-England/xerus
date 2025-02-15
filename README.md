# Xerus

HTTP primitives for Bun.

## Installation

```bash
bun add github:phillip-england/xerus
```

## Hello, World

Create an `index.ts` and paste in the following code:

```ts
import { Context, Handler, logger, Xerus } from "xerus/xerus";

const app = new Xerus();

// basic endpoint
app.get('/', async (c: Context) => {
  return c.html('<h1>Hello, World!</h1>')
})

// serve static files from ./static
app.get('/static/*', async (c: Context) => {
    let file = Bun.file('.'+c.path)
    if (!file.exists) {
      return c.status(404).send("file not found");
    }
    return await c.file(file);
  },
);

// running the application
const server = Bun.serve({
  port: 8080,
  fetch: async (req: Request) => {
    return await app.run(req);
  },
});

console.log(`Server running on ${server.port}`);
```

Run the application using:

```bash
bun run --hot index.ts
```

Visit `localhost:8080`

## Routing

`Xerus` supports static, dynamic, and wildcard paths.

Static path:
```ts
app.get('/', async (c: Context) => {
  return c.html('<h1>Hello, World!</h1>')
})
```

Dynamic path:
```ts
r.post('/user/:id', async (c: Context) => {
  return c.json({id: c.param('id')});
})
```

Wildcard path:
```ts
app.get('/static/*', async (c: Context) => {
    let file = Bun.file('.'+c.path)
    if (!file.exists) {
      return c.status(404).send("file not found");
    }
    return await c.file(file);
  },
);
```

## Context
`Context` allows us to work with the incoming requests and prepare responses.

Supported methods:

1. `c.redirect` - redirect to a new endpoint
```ts
return c.redirect('/')
```

2. `c.parseBody` - parse the incoming request body while enforcing a specific type
```ts
let data = await c.parseBody(BodyType.TEXT);
let data = await c.parseBody(BodyType.JSON);
let data = await c.parseBody(BodyType.MULTIPART_FORM);
let data = await c.parseBody(BodyType.JSON);
```

3. `c.param` - access dynamic path params like ':id' in '/user/:id'
```ts
c.param('id')
```

4. `c.status` - update the current status code
```ts
c.status(404)
```

5. `c.setHeader` and `c.getHeader` - set/get a response header
```ts
c.setHeader('content-type', 'text/html')
console.log(c.getHeader('content-type')) // text/html
```

6. `c.html` - send an html response
```ts
return c.html('<h1>Hello, World!</h1>')
```

7. `c.text` - send a plain text response
```ts
return c.text('Hello, World!')
```

8. `c.json` - send a json response
```ts
return c.json({message: 'Hello, World!'})
```

9. `c.stream` - stream a `ReadableStream`
```ts
  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode("Chunk 1: Hello, this is a streaming response!\n"));
      await new Promise((resolve) => setTimeout(resolve, 1000));
      controller.enqueue(encoder.encode("Chunk 2: Streaming world, one chunk at a time!\n"));
      controller.close();
    },
  });
  return await c.stream(stream)
```

10. `c.file` - send a file in a response
```ts
let file = Bun.file('./path/to/file')
if (!file.exists) {
  // handle missing file
}
return c.file(file)
```

11. `c.setStore` and `c.getStore` - set/get values on the request store
```ts
c.setStore('key', 'value')
console.log(c.getStore('key')) // value
```

12. `c.setCookie`, `c.getCookie`, and `c.clearCookie` - set/get/clear a cookie
```ts
c.setCookie("user", "john_doe", { path: "/", httpOnly: true });
console.log(c.getCookie('user')) // john_doe
c.clearCookie('user')
console.log(c.getCookie('user')) // undefined
```


## Static Files

Use a wildcard to setup static files:
```ts
app.get('/static/*', async (c: Context) => {
    let file = Bun.file('.'+c.path)
    if (!file.exists) {
      return c.status(404).send("file not found");
    }
    return await c.file(file);
  },
);
```

## Middleware

