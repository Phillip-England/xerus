import { RouteModule } from "../../../filerouter";
import { HTTPContext } from "../../..";


let module = new RouteModule();

module.get(async (c: HTTPContext) => {
  return c.jsx(
    <>
      <h1>Hello, World!</h1>
    </>
  );
});

export default module;