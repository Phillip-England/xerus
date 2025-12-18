
// NEW: Update to allow returning a Response or void
export type MiddlewareNextFn = () => Promise<void | Response>;