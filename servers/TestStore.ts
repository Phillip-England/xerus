// A single shared Store type for the test servers.
// Add keys here whenever a test/middleware writes to c.data / c.setStore(...)

export interface TestStore {
  // Common patterns middleware
  requestId?: string;
  csrfToken?: string;

  // Object pool tests
  test_val?: string;

  // Treasure middleware test
  secretKey?: string;

  // Timeout middleware uses these internal flags
  __timeoutSent?: boolean;
  __holdRelease?: Promise<void>;
}
