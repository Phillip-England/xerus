import {
  logger,
  XerusContext,
  XerusHandler,
  XerusMiddleware,
} from "../../../src/index";
import React from "react";

export async function hello(c: XerusContext, next: XerusHandler) {
  c.text("hello from middleware");
  await next(c);
}

export const use: XerusMiddleware[] = [hello];

export const get: XerusHandler = async (c: XerusContext) => {
  c.jsx(<h1>{c.dyn("id")}</h1>);
};
