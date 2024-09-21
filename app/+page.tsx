import { XerusContext, XerusHandler, XerusRoute } from "../src/index";
import React from "react";

export const get: XerusRoute = new XerusRoute(async (c: XerusContext) => {
  c.jsx(<h1>Hello, World</h1>);
});
