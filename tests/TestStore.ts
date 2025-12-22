import type { InjectableStore } from "../src/RouteFields";

export class TestStore implements InjectableStore {
  // This key is where it lives inside c.store["TestStore"]
  storeKey = "TestStore";

  // Properties
  requestId?: string;
  csrfToken?: string;
  test_val?: string;
  secretKey?: string;
  
  // Internal flags can remain if needed, or be managed by the framework
  __timeoutSent?: boolean;
  __holdRelease?: Promise<void>;
  
  // Allow dynamic keys if you really need them (like [key: string]: any)
  [key: string]: any;
}