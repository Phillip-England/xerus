import { RouteModule, HTTPContext } from 'xerus'
import { BaseLayout } from '../src/components.tsx'

let module = new RouteModule();

module.get(async (c: HTTPContext) => {
  return c.jsx(
    <BaseLayout title="Home Page">
      <h1>Home Page!</h1>
    </BaseLayout>,
  );
});

export default module;