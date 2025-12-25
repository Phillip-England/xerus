import type { Xerus } from "./Xerus";
import type { XerusRoute } from "./XerusRoute";

export interface XerusPlugin {
  /**
   * Called immediately when app.plugin(SomePlugin) is called.
   */
  onConnect?(app: Xerus): Promise<void> | void;

  /**
   * Called whenever a route is mounted.
   * Useful for inspecting or modifying routes before they are locked into the router.
   */
  onRegister?(app: Xerus, route: XerusRoute): Promise<void> | void;

  /**
   * Called inside app.listen() before the server actually starts.
   * Useful for async setup (database connections, etc).
   */
  onPreListen?(app: Xerus): Promise<void> | void;

  /**
   * Called when the app is shutting down (SIGINT/SIGTERM or app.shutdown()).
   * Useful for cleaning up resources (closing DB connections, etc).
   */
  onShutdown?(app: Xerus): Promise<void> | void;
}