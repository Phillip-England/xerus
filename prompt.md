Okay I have found and issue with this framework, specifically the way it deals with Injection versus Validation:

Here is what I would like to make happen:

I have notied that sometimes, I have something I am injecting into a Route which depends on Validated data.

For examples, lets say I have a dependancy which depends on valdiated query parameters to do its job?

Well, I would like to be able to attach validators WITHIN dependency injectors, making those validated data types also available in the main handlers. It might look something like this:

```ts
class SomeQueryParam implements TypeValidator {
  query: string
  validate(c: HTTPContext) {
    this.query = c.query("someQuery", "")
  }
}

class UserService implements InjectableStore {
  someQueryParam: Validator.Ctx(SomeQueryParam)
  init(c: HTTPContext) {
    // do some work to inject data into the route
    // WHILE having access to validated data
  }
}

class SomeRoute extends XerusRoute {
  path: string = "/"
  method: string = = "GET"
  user: Inject(UserService) // UserService has access to SomeQueryParam under the hood
  async handle(c: HTTPContext) {
    c.user.someQueryParam.query // access the query param
    c.data(SomeQueryParam)
  }
}
```

In this way, Injectables can now declare their own validatable data which they need access to, which is then made accessible in the main handler.

This requires us to be very clear about the order or events and it changes the role of route level injection.

Xerus.inject() is to store things like config, db handlers, ect.

But Inject() on a route is used to ensure data can be shared amoungst routes in a consistent manner, while ensuring validatable data is accesible at all layers of the processes.

```ts
Inject(UserService)
```

can now be attached to any route, and the route doesnt have to worry about any sort of validation logic, it just simply has access to the underlying data.

The Injected service worries about its own validation.

This isn't to say we can't validate at the route level, but allowing services to validate allows us to couple Services with their dependancies, thus reducing code in our actual route handlers.

This allows us to inject data into routes, without worrying about the validation layer.

the validation layer is handlers by validators and then that validated data can be further processed be injectors, which then return the final data to the route.

Can you please make all the cahnges needed to make this happen? please return full files: