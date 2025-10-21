import { RouteModule } from "../../../../../filerouter";
import { HTTPContext } from "../../../../..";

let module = new RouteModule();

module.get(async (c: HTTPContext) => {
  return c.jsx(
    <>
      <h1>Hello, User {c.getParam('id')}</h1>
    </>
  );
});

export default module;