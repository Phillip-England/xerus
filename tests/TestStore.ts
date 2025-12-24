import type { InjectableStore } from "../src/RouteFields";

export class TestStore implements InjectableStore {
  storeKey = "TestStore";

  requestId?: string;
  csrfToken?: string;
  test_val?: string;
  secretKey?: string;

  __timeoutSent?: boolean;
  __holdRelease?: Promise<void>;

  [key: string]: any;
}
