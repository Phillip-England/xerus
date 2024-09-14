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


