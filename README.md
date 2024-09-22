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
