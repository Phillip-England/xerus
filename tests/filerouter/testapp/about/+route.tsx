import { RouteModule } from "../../../../src/filerouter/RouteModule";
import { cascade } from "../../../../src/filerouter/RouteModule";
import { HTTPContext, Middleware, type MiddlewareNextFn } from "../../../..";


let module = new RouteModule();

module.get(async (c: HTTPContext) => {
  return c.jsx(
    <>
      <h1>About Me!</h1>
    </>
  );
}, cascade(new Middleware(async(c: HTTPContext, next: MiddlewareNextFn) => {
  next()
  return c.jsx(
    <>
      <h1>About Me, With Middleware!</h1>
    </>
  )
})));

export default module;