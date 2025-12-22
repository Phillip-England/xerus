export interface TestStore {
  requestId?: string;
  csrfToken?: string;
  test_val?: string;
  secretKey?: string;
  __timeoutSent?: boolean;
  __holdRelease?: Promise<void>;
  [key: string]: any;
}
