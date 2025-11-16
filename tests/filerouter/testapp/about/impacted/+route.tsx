import { RouteModule } from "../../../../../src/filerouter/RouteModule";
import { HTTPContext } from "../../../../..";


let module = new RouteModule();

module.get(async (c: HTTPContext) => {
  return c.jsx(
    <>
      <h1>It Doesn't Matter What I Say!</h1>
    </>
  );
});

export default module;