// Refactored: Strictly return Promise<void>.
// Logic should rely on mutating HTTPContext, not returning Response objects.
export type MiddlewareNextFn = () => Promise<void>;
