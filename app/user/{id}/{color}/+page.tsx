import { XerusContext, XerusRoute } from "../../../../src/index";
import React from "react";

export const get: XerusRoute = new XerusRoute(async (c: XerusContext) => {
  let id = c.dyn("id");
  let color = c.dyn("color");
  c.text(id + color);
});
