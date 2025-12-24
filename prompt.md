Okay, I want to push the limits of the framework. I think I have found a very clear distinction that is important in this framework:

Middleware and Injectable types/services are pretty much the same thing and have the same use-caes. Let me explain.

Right now, middleware in our framework is all about being able to alter the request context in an nice and orderly manner.

Injectable types can do the same thing, and they are more easily available in Route handlers after their work is completed because they are available directly as a property of the route.

The only issue is that middleware's order can be dictated while injectable srvices cannot.

Also, right now, injectable services only allow me to run code prior to a route being ran, but If I want injectable services to replace middleware outright, we need a way to them to run after a handler is done exectugin to. We need to give injectable services lifecycle methods, and then they can replace middleware.

Also, we need a way to dictate the order in which injectable services run.

Injectable services can already have their own validated data, which is great, now we just need to give users the ability to set lifecycle methods on injectable services and set the order they are carried out in.

Then we can remove middleware alltogether and keep Routes very clear.

Validators get your small bits of data and clean them up.
Sevices use validators to make classes of data available for a class (and perform some action on the context if needed) and Route handlers take the data and package it up from response. Each layer has their own responsbility with data and they can all pass their data up the tree.

Validators pipe into Injectables which pipe into Routes

At the end of the day, Id like something like this:

```ts
class SomeValidQuery implements TypeValidator {
  value = ''
  async validate(c: HTTPContext) {
    this.value = c.query('someQuery', 'defaultValue')
  }
}

// CHANGED NAME OF INJECTABLE STORE TO XERUSSERVICE
// WE CAN STILL INJECT SERVICES USING XERUS.INJECT
// AT THE FRONT OF THE APP BUT THE IDEA IS INJECTED SERVICES
// ARE NOW SIMPLY CALLED "SERVICES" OR XERUSSERVICE
class SomeService implemnts XerusService {
  someValidQuery: Validator.Ctx(SomeValidQuery)
  cat = ''
  // maybe change the name of init?
  // since it is a lifecycle method that runs before the route (BUT AFTER VALIDATION AS SERVICES NEED ACCESS TO VALIDATED DATA)
  // so maybe init is not the right name anymore
  // i tried the name 'before' this time
  async before(c: HTTPContext) {
    // do some work setting up data for the handlerc
    this.cat = 'meow'
  }
  // lifecycle method for after a handler is complete
  async after(c: HTTPContext) {
    console.log('I log after the route is executed')
  }
}


class SomeRoute extends XerusRoute {
  path: "/"
  method: Method.GET
  inject: [
    Inject(SomeService), 
    Inject(AnotherService)
  ] // the order here allows us to determine the order services execute
  someValidatedData: Validator.Ctx(SomeValidatorClass) // this is still okay
  async handle(c: HTTPContext) {
    // we need some way to get the data
    let someService = c.service(SomeService)
    let anotherService = c.service(AnotherService)
    // we can also still directly access Validated data
    // because the order of validated data does not matter
    // but, Validation data still can live on Services too
    // It should be able to live in both areas
    console.log(this.someValidatedData) // console.logs the class 'SomeValidatedData"
    c.html("<p>"+someService.cat+"</p>") // <p>meow!</p>
  }
}
```

One thing needs to be really clear, from a user perspective, I should not be grabbing items using c.getStore.

The only way A user should derive data in a route is through c.global for aquiring globally-available data like configuration or database handlers, or by calling c.service()

At the end of the day, validator's are used to validate pieces of data services are used to take validated data and orchestrated in some manner, and then services can be injected into routes where routes can finally make use of the data with each stage having its own purpose and intent thus making these services shareable amongst many different routes and giving them lifecycle methods enabling them to run after the route two then we can remove metal wire from the project altogether. Can you please help to make these coat changes as clean and smooth as possible, please can you please also return full files to me that would be amazing.