# Xerus
An Express-like HTTP Library for Bun

## Docs
Read the [docs](https://xerus.dev)

## Installation
```bash
bun add github:phillip-england/xerus
```

## Quick Scaffolding
Xerus comes with a cli for quick scaffolding:
```bash
bun add -g github:phillip-england/xerus
```

## Quickstart
```ts
import { HTTPContext, logger, Xerus } from "xerus/xerus";

let app = new Xerus()

app.use(logger)

app.get("/static/*", async (c: HTTPContext) => {
  return await c.file("." + c.path);
});

app.get('/', async (c: HTTPContext) => {
  return c.html(`<h1>O'Doyle Rules!</h1>`)
})

await app.listen()
```

## HTTPHandlerFunc

An `HTTPHandlerFunc` takes in an `HTTPContext` and returns `Promise<Response>`:
```ts
let handler = async (c: HTTPContext) => {
  return c.html(`<h1>O'Doyle Rules</h1>`)
}

app.get('/', handler)
```


## Routing

`Xerus` supports static, dynamic, and wildcard paths:

```ts
app.get('/', handler)
app.get('/user/:id', handler)
app.get('/static/*', handler)
```

Group routing is also supported:

```ts
app.group('/api')
  .post('/user/:id', handler)
  .post('/user/post/:postNumber', handler)
```

## File Based Routing
Xerus offers a file-based routing system which can be used as follows:
```ts
import { FileRouter } from "xerus";
import path from "path";

let router = await FileRouter.new({
  "src": path.join(process.cwd(), "app"),
  "port": 8080,
});
```

### App Initalization (file based routing)
Assuming `./app` is your project root, `./app/+init.tsx` is where you can run any init logic:

Below, I set up logging and serving static files.

`./app/+init.tsx`:
```ts
let module = new InitModule();

module.init(async (app: Xerus) => {
  app.use(logger);
  app.static("static");
});

export default module;

```

### Routes  (file based routing)
Assuming `./app` is your project root, `./app/+route.tsx` will provide the logic for all routes hitting `/`:

`./app/+route.tsx`:
```ts
let module = new RouteModule();

module.get(async (c: HTTPContext) => {
  return c.jsx(
    <GuestLayout title="Home Page">
      <h1>Home Page!</h1>
    </GuestLayout>,
  );
});

export default module;
```

For `/about`, place the following in `./app/about/route.tsx`:
```ts
let module = new RouteModule();

module.get(async (c: HTTPContext) => {
  return c.jsx(
    <GuestLayout title="About Page">
      <h1>Home Page!</h1>
    </GuestLayout>,
  );
});

export default module;
```

For dynamic routing, try `./app/user/:id/+route.tsx`:
```ts
let module = new RouteModule();

module.get(async (c: HTTPContext) => {
  return c.jsx(
    <GuestLayout title="User Page">
      <h1>User {c.getParam('id')}</h1>
    </GuestLayout>,
  );
});

export default module;
```

### Middlware  (file based routing)
Middlware is export out of `+route.tsx` file. All middlware can be of type `Cascade` or `Isolate`.

In short, `Cascade` middleware will pour down onto any file beneath itself in the filesystem whereas `Isolate` middleware will only affect the route it is exported from.

For example, here we apply the same middleware, once as `Isolate`, then again as `Cascade`:

```ts
const testmw = new Middleware(
  async (c: HTTPContext, next: MiddlewareNextFn) => {
    console.log("before");
    await next();
    console.log("after");
  },
);


let module = new RouteModule();

module.get(async (c: HTTPContext) => {
  return c.jsx(
    <GuestLayout title="Home Page">
      <h1>User {c.getParam('id')}</h1>
    </GuestLayout>,
  );
}, isolate(testmw), cascade(testmw));

export default module;
```

Middleware is excuted from top to bottom in sync with the filesystem.


## Static Files

Use a wildcard to serve static files from `./static`:

```ts
app.get("/static/*", async (c: HTTPContext) => {
  return await c.file("." + c.path);
});
```

## Middleware

Middleware executes in the following order:
1. Global
2. Group
3. Route

Create a new `Middleware`:
```ts
let mw = new Middleware(
  async (c: HTTPContext, next: MiddlewareNextFn): Promise<void | Response> => {
    console.log('logic before handler');
    next();
    console.log("logic after handler");
  },
);
```

Link it globally:
```ts
app.use(mw)
```

Or to a group:
```ts
app.group('/api', mw) // <=====
  .post('/user/:id', handler)
  .post('/user/post/:postNumber', handler)
```

Or to a route:
```ts
app.get('/', handler, mw) // <=====
```

Chain as many as you'd like to all three types:
```ts
app.use(mw, mw, mw)

app.group('/api', mw, mw, mw)
  .post('/user/:id', handler)
  .post('/user/post/:postNumber', handler)

app.get('/', handler, mw, mw, mw)
```


## HTTPContext
`HTTPContext` allows us to work with the incoming requests and prepare responses. Here are the features it provides.

### Redirect The Request
```ts
app.get('/', async (c: HTTPContext) => {
  return c.html(`<h1>O'Doyle Rules</h1>`)
})

app.get('/redirect', async(c: HTTPContext) => {
  return c.redirect('/')
})
```

### Parse The Request Body
Use the `BodyType` enum to enforce a specific type of data in the request body:

```ts
app.post('/body/text', async (c: HTTPContext) => {
  let data = await c.parseBody(BodyType.TEXT)
  return c.json({data: data})
})

app.post('/body/json', async (c: HTTPContext) => {
  let data = await c.parseBody(BodyType.JSON)
  return c.json({data: data})
})

app.post('/body/multipart', async (c: HTTPContext) => {
  let data = await c.parseBody(BodyType.MULTIPART_FORM)
  return c.json({data: data})
})

app.post('/body/form', async (c: HTTPContext) => {
  let data = await c.parseBody(BodyType.FORM)
  return c.json({data: data})
})
```

### Get Dynamic Path Param
```ts
app.get('/user/:id', async (c: HTTPContext) => {
  let id = c.getParam('id')
  return c.html(`<h1>O'Doyle Rules Times ${id}!</h1>`)
})
```

### Set Status Code
```ts
app.get('/', async (c: HTTPContext) => {
  return c.setStatus(404).html(`<h1>O'Doyle Not Found</h1>`)
})
```

### Set Response Headers
```ts
app.get('/', async (c: HTTPContext) => {
  c.setHeader('X-Who-Rules', `O'Doyle Rules`)
  return c.html(`<h1>O'Doyle Rules!</h1>`)
})
```

### Get Request Header
```ts
app.get('/', async (c: HTTPContext) => {
  let headerVal = c.getHeader('X-Who-Rules')
  if (headerVal) {
    return c.html(`<h1>${headerVal}</h1>`)
  }
  return c.html(`<h1>Header missing</h1>`)
})
```

### Respond with HTML, JSON, or TEXT
```ts
app.get('/html', async (c: HTTPContext) => {
  return c.html(`<h1>O'Doyle Rules!</h1>`)
})

app.get('/json', async (c: HTTPContext) => {
  return c.json({message: `O'Doyle Rules!`})
})

app.get('/text', async (c: HTTPContext) => {
  return c.text(`O'Doyle Rules!`)
})
```

### Stream A Response
```ts
app.get('/', async (c: HTTPContext) => {
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      let count = 0;
      const interval = setInterval(() => {
        controller.enqueue(encoder.encode(`O'Doyle Rules! ${count}\n`));
        count++;
        if (count >= 3) {
          clearInterval(interval);
          controller.close();
        }
      }, 1000);
    }
  });
  c.setHeader("Content-Type", "text/plain");
  c.setHeader("Content-Disposition", 'attachment; filename="odoyle_rules.txt"');
  return c.stream(stream);
});
```

### Response With A File
```ts
app.get('/', async (c: HTTPContext) => {
  return c.file("./path/to/file");
});
```

### Stream A File
```ts
app.get('/', async (c: HTTPContext) => {
  return c.file("./path/to/file", true);
});
```

### Set, Get, And Clear Cookies
```ts
app.get('/set', async (c: HTTPContext) => {
  c.setCookie('secret', "O'Doyle_Rules!")
  return c.redirect('/get')
});

app.get('/get', async (c: HTTPContext) => {
  let cookie = c.getCookie('secret')
  if (cookie) {
    return c.text(`visit /clear to clear the cookie with the value: ${cookie}`)
  }
  return c.text('visit /set to set the cookie')
})

app.get('/clear', async (c: HTTPContext) => {
  c.clearCookie('secret')
  return c.redirect('/get')
})
```

## Custom 404

```ts
app.onNotFound(async (c: HTTPContext): Promise<Response> => {
  return c.setStatus(404).text("404 Not Found");
});
```

## Custom Error Handling

```ts
app.onErr(async (c: HTTPContext): Promise<Response> => {
  let err = c.getErr();
  console.error(err);
  return c.setStatus(500).text("internal server error");
});
```

## Web Sockets

Setup a new websocket route, using `onConnect` for pre-connect authorization:
```ts
app.ws("/chat", {
  async open(ws) {
    let c = ws.data // get the context
    
  },
  async message(ws, message) {

  },
  async close(ws, code, message) {

  },
  async onConnect(c: WSContext) {
    c.set('secret', "O'Doyle") // set pre-connect data
  }
});
```