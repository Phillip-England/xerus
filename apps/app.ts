import { Handler } from "../handler";
import { logger, Middleware } from "../middleware";
import { Context } from "../context";
import { Router } from "../router";

// define router
const r = new Router();



// middleware to test
let mwEcho1 = new Middleware(async (c, next) => {
  console.log('echo 1 BEFORE')
	await next()
	console.log('echo 1 AFTER')
});

let mwEcho2 = new Middleware(async (c, next) => {
  console.log('echo 2 BEFORE')
	await next()
	console.log('echo 2 AFTER')
});

let mwStore = new Middleware(async (c, next) => {
	c.store('test', 'testvalue')
	await next()
})

let mwNoNext = new Middleware(async (c, next) => {
  // i dont call next!
});

let mwEarlyResponse = new Middleware(async (c, next) => {
  console.log('mwEarlyResponse executing');
  const response = new Response("hello from middleware");
  console.log('mwEarlyResponse created response');
  return response;
});

//==========================================
// testing basic context methods
//==========================================

r.get("/context", new Handler(async (c: Context): Promise<Response> => {
  return c.html("<h1>Hello, World!</h1>");
}, logger));

r.get("/test/store", new Handler(async (c: Context): Promise<Response> => {
  return c.html(`<h1>${c.retrieve('test')}</h1>`);
}, logger, mwStore));

r.get("/test/middleware/early-response", new Handler(async (c: Context): Promise<Response> => {
  return c.html(`<h1>You should not see me because of early response</h1>`);
}, logger, mwEarlyResponse));

r.get("/test/mw/no-next", new Handler(async (c: Context): Promise<Response> => {
  return c.html(`<h1>You should not see me because of </h1>`);
}, logger, mwNoNext));

r.get("/user/:id", new Handler(async (c: Context): Promise<Response> => {
  return c.html(`<h1>${c.param('id')}</h1>`);
}, logger));

r.get("/static/*", new Handler(async (c: Context): Promise<Response> => {
	let file = await c.file("."+c.path)
	if (!file) {
		return c.status(404).send('file not found')
	}
	return file
}));


// server config
const server = Bun.serve({
  port: 8080,
  fetch: async (req: Request) => {
    try {
      const { handler, context } = r.find(req);
      if (handler) {
        return handler.execute(context);
      }
      return context.status(404).send("404 Not Found");
    } catch (e: any) {
      console.error(e);
      return new Response("internal server error", { status: 500 });
    }
  },
});


console.log(`Server running on ${server.port}`);
