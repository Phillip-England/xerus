import type { JSX } from "react";

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