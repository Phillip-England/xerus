okay I would like to simplify how values are injected into Routes using Services.

Here is how it works now:

```ts
class InjectionRoute extends XerusRoute {
  method = Method.GET;
  path = "/injection/test";
  inject = [Inject(UserService), Inject(MetricsService)];
  async handle(c: HTTPContext) {
    const userService = c.service(UserService);
    const metrics = c.service(MetricsService);
    json(c, {
      users: userService.getUsers(),
      serviceName: userService.storeKey,
      initialized: metrics.initialized,
      processingTime: metrics.getUptime(),
    });
  }
}
```

take a look at thie line:

```ts
  inject = [Inject(UserService), Inject(MetricsService)];
```

why not just do:

```ts
services = [UserService, MetricsService]
```

same things with validators they are all complicated too.
They should work like this:

```ts
validators = [QueryValidator, PathValidator]
```

and then behind the scenes Xerus runs `Inject()` and `Validate()`

this eliminates the need to do this, and in fact we shoud enforce this new method. If someone wants to pipe validated data into a Route or Service, they should have to do it through th `validators` property.

Likewise, if someone wants to pipe a service into a Route, they should only be able to do so by using the `services` property.

Also, and this might be the biggest changes so far, but Services must be able to themselves depend on other Servies. This resolves the following issue.

Imagine a Service exists in a code base, and we need to extend it. BUT we don't want to change the original service because it is mission critical. So, instead we can create a new service and Inject the mission-critial service into the "Adapter Service" via the `services` array as well.

With this, Services themselves can have their own internal services.

This enables us to be sure any service we create is reusable in other services that might wrap it later.

This should give our users a single way to inject services and validators, while also allowing services to be more composable. We do not need to worry about validators being composable in the same sense as validators represent the most atomic form of data. A validators is used to represent something like a query parameter, or a request header, and you need to ensure the value is correct.

That being said, our validators are kind of confusing right now, they return the whole object (which includes the validate method itself)

Instead, make validators *feel* more atomic by ensuring the validate method returns some value.

Then, when we access a validated property, we are accessing the value *returned* from the validate method, not the object itself (unless of course that is what was returned.)

With all of this to be said, these changes are geared on UX of the framework and all about standardizing ways of doing things.

Please help me implment these changes as full files:

Thank you!