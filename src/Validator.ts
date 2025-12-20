import { z } from "zod";
import { Middleware } from "./Middleware";
import { HTTPContext, type Constructable } from "./HTTPContext";
import { BodyType } from "./BodyType";
import { Source, type ValidationConfig } from "./ValidationSource"; // Updated import
import { SystemErr } from "./SystemErr";
import { SystemErrCode } from "./SystemErrCode";
import type { TypeValidator } from "./TypeValidator";

/**
 * Validator Middleware
 * @param TargetClass The class definition to instantiate and validate.
 * @param config Where to derive the data from. Defaults to Source.JSON.
 */
export const Validator = <T extends TypeValidator>(
  TargetClass: Constructable<T>,
  config: ValidationConfig = Source.JSON
) => {
  return new Middleware(async (c: HTTPContext, next) => {
    let rawData: any;

    try {
      // 1. Extract Data based on Configuration
      switch (config.target) {
        case "BODY":
          if (config.format === "JSON") rawData = await c.parseBody(BodyType.JSON);
          else if (config.format === "FORM") rawData = await c.parseBody(BodyType.FORM);
          else if (config.format === "MULTIPART") rawData = await c.parseBody(BodyType.MULTIPART_FORM);
          break;

        case "QUERY":
          // If a key is specified, we extract JUST that key into an object wrapper
          // e.g. ?page=1 becomes { page: "1" }
          if (config.key) {
            const val = c.query(config.key);
            rawData = { [config.key]: val }; 
          } else {
            // Otherwise take all queries
            rawData = c.queries;
          }
          break;

        case "PARAM":
          if (!config.key) throw new SystemErr(SystemErrCode.INTERNAL_SERVER_ERR, "Source.PARAM requires a key");
          const paramVal = c.getParam(config.key);
          rawData = { [config.key]: paramVal };
          break;

        case "HEADER":
          if (!config.key) throw new SystemErr(SystemErrCode.INTERNAL_SERVER_ERR, "Source.HEADER requires a key");
          const headerVal = c.getHeader(config.key) || "";
          rawData = { [config.key]: headerVal };
          break;

        default:
          throw new SystemErr(SystemErrCode.INTERNAL_SERVER_ERR, "Unknown validation source");
      }
    } catch (e: any) {
        throw e;
    }

    // 2. Instantiate the Class with the derived data
    const instance = new TargetClass(rawData);

    // 3. Run the Class's validation logic
    try {
      await instance.validate();
    } catch (e: any) {
      if (e instanceof z.ZodError) {
        const errorMessages = e.issues
          .map((err: any) => `${err.path.join(".")}: ${err.message}`)
          .join(", ");
        throw new SystemErr(
          SystemErrCode.BODY_PARSING_FAILED,
          `Validation Failed: ${errorMessages}`
        );
      }

      throw new SystemErr(
        SystemErrCode.BODY_PARSING_FAILED,
        e.message || "Validation failed"
      );
    }

    // 4. Store the validated class instance
    c.setValid(TargetClass, instance);

    await next();
  });
};