import { XerusContext, XerusRoute } from "../../../src/index";
import React from "react";

export const get: XerusRoute = new XerusRoute(async (c: XerusContext) => {
  let mdContent = await c.md();
  c.html(mdContent);
});
