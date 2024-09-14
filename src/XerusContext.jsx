import { XerusResponse } from "./XerusResponse";
import ReactDOMServer from "react-dom/server";

export class XerusContext {
  constructor(req, globalContext, timeoutDuration) {
    this.url = new URL(req.url);
    this.path = this.url.pathname;
    this.req = req;
    this.res = new XerusResponse();
    this.timeoutDuration = timeoutDuration;
    this.isReady = false;
    this.globalContext = globalContext;
    this.urlContext = {};
  }

  respond() {
    if (!this.isReady) {
      return new Response("response body not set", {
        status: 500,
      });
    }
    return new Response(this.res.body, {
      headers: this.res.headers,
      status: this.res.status,
    });
  }

  async form() {
    return await this.req.formData();
  }

  setHeader(key, value) {
    this.res.headers[key] = value;
  }

  html(str) {
    this.res.headers["Content-Type"] = "text/html";
    this.res.body = str;
    this.isReady = true;
  }

  redirect(path) {
    this.res.headers["Location"] = path;
    this.res.status = 303;
    this.isReady = true;
  }

  json(obj) {
    let jsonObj = JSON.stringify(obj);
    this.res.headers["Content-Type"] = "application/json";
    this.res.body = jsonObj;
    this.isReady = true;
  }

  status(s) {
    this.res.status = s;
    this.isReady = true;
  }

  jsx(component) {
    this.res.headers["Content-Type"] = "text/html";
    this.res.body = ReactDOMServer.renderToString(component);
    this.isReady = true;
  }

  file(file) {
    this.res.body = file;
    this.res.headers["Content-Type"] = file.type;
    this.isReady = true;
  }

  param(paramName) {
    let url = new URL(this.req.url);
    return url.searchParams.get(paramName);
  }

  getGlobal(someKey) {
    return this.globalContext[someKey];
  }

  dyn(key) {
    let arrIndex = this.urlContext[key];
    let path = new URL(this.req.url).pathname;
    let parts = path.split("/");
    return parts[arrIndex];
  }

  text(message) {
    this.res.body = message;
    this.res.headers["Content-Type"] = "text/plain";
    this.isReady = true;
  }
}
