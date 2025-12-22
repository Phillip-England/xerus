Okay this seems weird..?

```ts
class CustomRoute extends XerusRoute {
  method = Method.GET;
  path = "/vtypes/custom";

  auth = Validator.Param(
    Source.CUSTOM((c) => c.getHeader("X-Api-Key")),
    ApiKeyValidator,
  );

  async handle(c: HTTPContext) {
    c.json({ authorized: true, key: this.auth.key });
  }
}
```

this line especially:

```ts
Source.CUSTOM((c) => c.getHeader("X-Api-Key")),
```

So, the reason it feels weird, is because the custom type should already have a
validate function where they have access to c: HTTPContext look:

```ts
export class ApiKeyValidator implements TypeValidator {
  key: string;
  constructor(raw: any) {
    this.key = raw;
  }
  async validate(c: HTTPContext) {
    if (this.key !== "secret-123") {
      throw new SystemErr(SystemErrCode.VALIDATION_FAILED, "Invalid API Key");
    }
  }
}
```

Instead, to make this better, we should remove Source.CUSTOM from the framework
and instead rely on Injection to access custom types in a route:

```ts
import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import { HTTPContext } from "../../src/HTTPContext";
import { Inject, type InjectableStore } from "../../src/RouteFields";

// 1. A Simple Data Service
class UserService implements InjectableStore {
  // Optional: unique key to store in context.store (defaults to class name)
  storeKey = "UserService";

  private users = ["Alice", "Bob"];

  getUsers() {
    return this.users;
  }
}

// 2. A Service with Lifecycle (init)
class MetricsService implements InjectableStore {
  initialized = false;
  startTime = 0;

  // init() is called automatically by the framework *before* the route handler
  async init(c: HTTPContext) {
    this.initialized = true;
    this.startTime = Date.now();
  }

  getUptime() {
    return Date.now() - this.startTime;
  }
}

class InjectionRoute extends XerusRoute {
  method = Method.GET;
  path = "/injection/test";

  // 3. Inject dependencies into properties using the new pattern
  userService = Inject(UserService);
  metrics = Inject(MetricsService);

  async handle(c: HTTPContext) {
    // Simulate tiny processing delay
    await new Promise((r) => setTimeout(r, 1));

    c.json({
      users: this.userService.getUsers(),
      serviceName: this.userService.storeKey,
      initialized: this.metrics.initialized,
      processingTime: this.metrics.getUptime(),
    });
  }
}

export function injectionPattern(app: Xerus) {
  app.mount(InjectionRoute);
}
```

so we need to remove SOURCE.CUSTOM and then rely on injection instead:
