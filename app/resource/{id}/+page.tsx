import { XerusContext, XerusHandler } from "../../../src/index";
import React from "react";

export const get: XerusHandler = async (c: XerusContext) => {
  c.jsx(<h1>Hello, World</h1>);
};
