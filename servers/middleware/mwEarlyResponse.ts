import { Middleware } from "../../src/Middleware";

let mwEarlyResponse = new Middleware(async (c, next) => {
  console.log("mwEarlyResponse executing");
  const response = new Response("hello from middleware");
  console.log("mwEarlyResponse created response");
  return response;
});