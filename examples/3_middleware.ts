import { HTTPContext, Middleware, Xerus, type MiddlewareNextFn } from "../xerus";

let app = new Xerus()

let handler = async (c: HTTPContext) => {
  return c.html(`<h1>O'Doyle Rules</h1>`)
}

let mw = new Middleware(
  async (c: HTTPContext, next: MiddlewareNextFn): Promise<void | Response> => {
    console.log('logic before handler');
    next();
    console.log("logic after handler");
  },
);

// global middleware
app.use(mw, mw, mw)

// group middleware
app.group('/api', mw, mw, mw)
  .post('/user/:id', handler)
  .post('/user/post/:postNumber', handler)

// handler middleware
app.get('/', handler, mw, mw, mw)

await app.listen()