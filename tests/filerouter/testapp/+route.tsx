import type { JSX } from "react";
import { HTTPContext, RouteModule } from "../../..";


let module = new RouteModule();

module.get(async (c: HTTPContext) => {
  return c.jsx(
    <>
      <h1>Hello, World!!</h1>
    </>
  );
});



export const BaseLayout = (props: {
  title: string,
  children: JSX.Element,
}) => {
  return (
    <html>
      <head>
        <link rel='stylesheet' href='/static/output.css' ></link>
        <title>{props.title}</title>
      </head>
      <body>
        {props.children}
      </body>
    </html>
  )
}





export default module;