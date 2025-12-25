Okay I would like to implement some sort of plugin system for this framework.
Here is how it will work:

```ts

class SomePlugin implements XerusPlugin {

  // onConnect lifecycle action
  // gives us access to Xerus PRIOR to any Route registration
  async onConnect(app: Xerus) {

  }

  // onRegister lifecycle action 
  // gives us access to the Routes as they are full prepared to be registered
  async onRegister(app: Xerus, route: XerusRoute) {

  }

  // onPreListen lifecycle action
  // gives us access to Xerus in a state where all XerusRoute's are registered
  // BUT prior to actually listening on port
  async onPreListen(app: Xerus) {

  }

  // onShutdown lifecycle action
  // give us access to Xerus right before we shutdown
  async onShutdown(app: Xerus) {

  }

}

let app = new Xerus()

app.plugin(SomePlugin) // the order matters as it dictates the order plugin functions will run during lifecycle

```

in this way, plugins allow us to intercept route registration as well as other aspects of the Xerus connection and initatlization lifecycle.

Okay, with this being said, we will also need a way to manage graceful shutdowns.

That is not built into my frameowrk yet and we need it to implement onShutdown

can you please make these changes to introduce plugins?

Thank you so much!