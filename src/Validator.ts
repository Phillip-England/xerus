import { Middleware } from "./Middleware";
import { HTTPContext, type Constructable } from "./HTTPContext";
import { BodyType } from "./BodyType";
import { type ValidationConfig } from "./ValidationSource";
import { SystemErr } from "./SystemErr";
import { SystemErrCode } from "./SystemErrCode";
import type { TypeValidator } from "./TypeValidator";
import { z } from "zod";

export const Validator = <T extends TypeValidator>(
  TargetClass: Constructable<T>,
  config: ValidationConfig,
) => {
  return new Middleware(async (c: HTTPContext, next) => {
    let rawData: any;

    try {
      switch (config.target) {
        case "BODY":
          if (config.format === "JSON") rawData = await c.parseBody(BodyType.JSON);
          else if (config.format === "FORM") rawData = await c.parseBody(BodyType.FORM);
          else if (config.format === "MULTIPART") rawData = await c.parseBody(BodyType.MULTIPART_FORM);
          break;

        case "QUERY":
          rawData = config.key ? { [config.key]: c.query(config.key) } : c.queries;
          break;

        case "PARAM":
          if (!config.key) throw new SystemErr(SystemErrCode.INTERNAL_SERVER_ERR, "Source.PARAM requires a key");
          rawData = { [config.key]: c.getParam(config.key) };
          break;

        case "HEADER":
          if (!config.key) throw new SystemErr(SystemErrCode.INTERNAL_SERVER_ERR, "Source.HEADER requires a key");
          rawData = { [config.key]: c.getHeader(config.key) };
          break;

        case "WS_MESSAGE":
          rawData = c._wsMessage;
          if (Buffer.isBuffer(rawData)) rawData = rawData.toString();
          if (typeof rawData === "string") {
            try {
              rawData = JSON.parse(rawData);
            } catch {
              // allow raw string
            }
          }
          break;

        case "WS_CLOSE":
          rawData = c.getStore("_wsCloseArgs") || {};
          break;

        default:
          throw new SystemErr(SystemErrCode.INTERNAL_SERVER_ERR, "Unknown validation source");
      }
    } catch (e: any) {
      // Extraction/parsing problems
      throw new SystemErr(SystemErrCode.BODY_PARSING_FAILED, `Data Extraction Failed: ${e.message}`);
    }

    const safeData = rawData ?? {};
    const instance = new TargetClass(safeData);

    try {
      await instance.validate(c);
    } catch (e: any) {
      // ✅ Validation problems (semantic)
      if (e instanceof z.ZodError) {
        const msg = e.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ");
        throw new SystemErr(SystemErrCode.VALIDATION_FAILED, `Validation Failed: ${msg}`);
      }
      throw new SystemErr(SystemErrCode.VALIDATION_FAILED, e.message || "Validation failed");
    }

    // ✅ Store typed instance
    c.validated.set(TargetClass, instance);

    // ✅ Store convenience categories + string keys (multi-validator friendly)
    switch (config.target) {
      case "BODY":
        if (config.format === "JSON") {
          c.validated.json = instance;
          c.validated.set("json", instance);
        } else if (config.format === "FORM") {
          c.validated.form = instance;
          c.validated.set("form", instance);
        } else if (config.format === "MULTIPART") {
          c.validated.multipart = instance;
          c.validated.set("multipart", instance);
        }
        break;

      case "QUERY":
        c.validated.query = instance;
        c.validated.set(config.key ? `query:${config.key}` : "query", instance);
        c.validated.set("query", instance);
        break;

      case "PARAM":
        c.validated.params = instance;
        c.validated.set(config.key ? `param:${config.key}` : "param", instance);
        c.validated.set("param", instance);
        break;

      case "HEADER":
        c.validated.headers = instance;
        c.validated.set(config.key ? `header:${config.key}` : "header", instance);
        c.validated.set("header", instance);
        break;

      case "WS_MESSAGE":
        c.validated.wsMessage = instance;
        c.validated.set("ws_message", instance);
        break;

      case "WS_CLOSE":
        c.validated.wsClose = instance;
        c.validated.set("ws_close", instance);
        break;
    }

    await next();
  });
};
