# Xerus
A tiny http library for Bun 🐿️

Hello, World!
```jsx
let app = new Xerus()

app.get('/', async (c) => {
    c.jsx(
        <h1>Hello, World!</h1>
    )
})

await app.run(8080)
```

## Dynamic Paths
To declare a dynamic path, use braces `{}`

```js
app.get('/user/{id}', async (c) => {
    let id = c.dyn('id') // access the dynamic id
    c.text(id)
})
```

## Query Params
To access a url parameter

```js
app.get('/', async (c) => {
    // if we visit /?some_param=xerus, param will equal 'xerus'
    // if no param is in the url, it will equal ''
    let param = c.param('some_param')
    c.text(param)
})
```

## Redirecting
Redirect with ease

```js
app.get('/', async (c) => {
    c.redirect('/seeya')
})
```

## Global Context
Access variables across all handlers

```js

let app = new Xerus()

let myGlobalVar = 'yoooooo'
app.global('myvar', myGlobalVar)


app.get('/', async (c) => {
    c.text(c.getGlobal('myvar')) // returns 'yoooooo'
})
```

## Form Data
Access form data

```js
app.post("/", async (c) => {
  let data = await c.form();
  let username = data.get('username')
  c.text(username)
});
```

Trigger the endpoint
```bash
curl -X POST http://localhost:8080/ -d "username=your_username"
```

## Request Timeouts
Xerus can handle network timeouts using a provided middleware. The default timeout duration is 5000 milliseconds.

Adjusting the timeout duration to 3000 milliseconds and use the middleware on all routes
```js
app.setTimeoutDuration(3000);
app.use('*', timeout)
```

## Logging
Xerus also provides a logger

```js
app.use('*', logger)
```

## Custom Middleware
Here is the skeleton of a custom middleware. This middleware will log 'hello' before our handler is invoked and 'world' after our handler is invoked.

```js
export async function customMiddleware(c, next) {
  console.log('hello')
  await next();
  console.log('world')
}
```

## Using Middleware
Xerus uses 3 types of middleware and they execute in the following order

1. Global Middleware
2. Prefix Middleware
3. Route-Specific Middleware

### Global Middleware
To apply your middleware globally

```js
app.use('*', customMiddleware)
```

### Prefix Middleware
To apply your middleware to all routes starting with '/user'

```js
app.use('/user', customMiddleware)
```

### Route-Specific Middleware
To apply your middleware to a single route

```js
app.get('/', async (c) => {
    c.text('Hello, World!')
}, customMiddleware) // <===== chain on your middleware here
```

## File Based Route
Xerus comes with a file-based router, enabling your directory structure to generate your routes, thus reducing code for your application.

```js
const app = new Xerus();
const fbr = new FileBasedRouter(app);
let err = await fbr.mount();
if (err) {
  // handle the err
}
await app.run(8080);
```

### App Directory
By defualt, Xerus will check for your routes in `./app`. As of now, you cannot define a custom directory for your routes.


### File Based Route - Hello World
In the root of your project, use the following command to create the files needed for a `hello, world` example.

If you plan to use `JSX` as your templating solution, run:
```bash
mkdir app; cd app; touch +page.tsx
```

If you are going to use an alternative templating solution, run:
```bash
mkdir app; cd app; touch +page.ts
```

Both `.ts` and `.tsx` files are supported. As of now, `.js` and `.jsx` are not supported.

In `./app/+page.tsx` add the following code (you will also need to import `XerusRoute` and `XerusContext` from `xerus`):
```tsx
import React from "react";

export const get: XerusRoute = new XerusRoute(async (c: XerusContext) => {
  c.jsx(<h1>Hello, World</h1>);
});
```

The above code will basically be interpreted as:
```tsx
app.get("/", async (c: XerusContext) => {
  c.jsx(<h1>Hello, World</h1>);
});
```

### Using a different http method
If you want to use a different http method like `POST` just export a const named `post` instead of `get`
```tsx
export const post: XerusRoute = new XerusRoute(async (c: XerusContext) => {
  c.jsx(<h1>Hello, Post World</h1>);
});
```

### Dynamic File Based Endpoints
You can make a file based endpoint dynamic by doing the following.

Create a few directories inside of `./app`
```bash
mkdir app/user/{id}; cd app/user/{id}; touch +page.tsx
```

Now in `/app/user/{id}/+page.tsx`
```tsx
export const get: XerusRoute = new XerusRoute(async (c: XerusContext) => {
  c.jsx(<h1>{c.dyn("id")}</h1>);
});
```

The above code will and the following code have the same result
```tsx
app.get('/user/{id}', async (c) => {
  c.jsx(<h1>{c.dyn("id")}</h1>);
})
```

### Using middleware inside of file-based routes
Remember, we have global middleware, prefix middleware, and route-specific middleware. All can be utilized in our file based routing system.

1. Global Middleware

All global middleware will be applied to the application prior to mounting the file based router. For example:
```tsx
const app: Xerus = new Xerus();
app.use("*", timeout, logger); // setup global middleware PRIOR to mounting the router
const router = new FileBasedRouter(app);
let err = await router.mount();
if (err) {
  console.log(err);
}
await app.run(8080);
```

2. Prefix Middleware

Prefix middleware is established inside of `+page.tsx` files by exporting a const named `use`.
The following example will make all routes which start with `/about` apply the logger middleware.
Keep in mind, you need to actually import the logger to use it.

`/app/about/+page.tsx`
```tsx
export const use: XerusMiddleware[] = [logger]

export const get: XerusRoute = new XerusRoute(async (c: XerusContext) => {
  c.jsx(<h1>About me!</h1>);
});
```

3. Route Specific Middleware

Route specific middleware can be simply chained onto the end of a `XerusRoute` like so.

```tsx
export async function hello(c: XerusContext, next: XerusHandler) {
  c.text("hello from middleware");
  await next(c);
}

export const get: XerusRoute = new XerusRoute(async (c: XerusContext) => {
  c.jsx(<h1>You wont get to see me because the middleware will exit the endpoint early!</h1>);
}, hello); // <========== we chain our route-specific middleware on here
```

### Markdown Content Ease of Loading
Xerus has taken into account you may want to use markdown content in your application.

Xerus uses [Marked](https://github.com/markedjs/marked) under to hood.

As of now, All I've done is wrapped the basic usage of `marked` in a function call like so:

```tsx
app.get('/', async (c) => {
  let html = await c.md("./path/to/markdown/content.md")
  c.html(html)
})
```

Here is the real kicker, you can pre-load your markdown content in the `FileBasedRouter` by using `+content.md` files.

Let's assuming your file-based routes are located in the default `./app` directory.
```bash
./app
├── +page.tsx
├── +content.md
```

With the above example, the markdown content inside of `+content.md` is tranformed into html during the route-building process.
The markdown content can then be accessed using `c.md()` with no args passed to the function. Like so:

```tsx
export const get: XerusRoute = new XerusRoute(async (c: XerusContext) => {
  let mdContent = await c.md(); // <===== no arg passed
  c.html(mdContent);
});
```

This makes it very easy to utilize markdown content in your application without having to worry about file paths.
Just place a `+content.md` right next to your `+page.tsx` and you're good to go.
