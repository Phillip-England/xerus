Okay this request is just really to help syncronize the idea that "Classes are first class citizens" in this framework.

Right now, to set up Xerus.onErr and Xerus.onNotFound, I simply provide a function:
```ts
  onNotFound(h: HTTPHandlerFunc) {
    this.notFoundHandler = h;
  }

  onErr(h: HTTPErrorHandlerFunc) {
    this.errHandler = h;
  }
```

I would instead like to pass Xerus Routes like so:

```ts

class OnNotFoundRoute extends XerusRoute {
  path: // some path? idk what to put here i dont need a path
  method: // same thing, not methods needed
  async handle(c: HTTPContext) {

  }
}

Xerus.onNotFound(OnNotFoundRoute)

```

I should also be able to do the same thing with Xerus.onErr as well.

But here is the most important part: I want to do this in such a way that is does not add additional complexity to the way Routes and Xerus Route is managed. That is to say that I do not want the changes we make to accomplish this to impact how standard routes are made.

I would like the OnNotFoundRoute to accept Services and Validators too, so they function exactly like regular XerusRoutes, the only difference is they do not have a path or a method... or do they?

This is especially challenging because OnNotFoundRoutes do not have access to an error while error route function signatures do like so:

```ts
  onErr(h: HTTPErrorHandlerFunc) {
    this.errHandler = h;
  }
```

see, it uses HTTPErrorHandlerFunc which is different that what standard XerusRoutes use.

All this to be said, can you help make these changes in a way that doesnt require major changes in how i actually use the framework?

I want it to feel seemless.

