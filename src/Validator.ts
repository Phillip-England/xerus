import { z } from "zod";
import { Middleware } from "./Middleware";
import { HTTPContext } from "./HTTPContext";
import type { Constructable } from "./HTTPContext";
import { BodyType } from "./BodyType";
import { ValidationSource } from "./ValidationSource";
import { SystemErr } from "./SystemErr";
import { SystemErrCode } from "./SystemErrCode";
import type { TypeValidator } from "./TypeValidator";

/**
 * Validator Middleware
 * @param TargetClass The class definition to instantiate and validate.
 * @param source Where to derive the data from (JSON, FORM, QUERY). Defaults to JSON.
 */
export const Validator = <T extends TypeValidator>(
  TargetClass: Constructable<T>,
  source: ValidationSource = ValidationSource.JSON
) => {
  return new Middleware(async (c: HTTPContext, next) => {
    let rawData: any;

    try {
      switch (source) {
        case ValidationSource.JSON:
          rawData = await c.parseBody(BodyType.JSON);
          break;
        case ValidationSource.FORM:
          rawData = await c.parseBody(BodyType.FORM);
          break;
        case ValidationSource.MULTIPART_FORM:
          // Note: Multipart forms often contain Files which might not map directly 
          // to simple class properties without custom logic, but we pass the FormData object (or converted object).
          // parseBody(MULTIPART) currently returns FormData object. 
          // User's class constructor must handle FormData input if used.
          rawData = await c.parseBody(BodyType.MULTIPART_FORM);
          break;
        case ValidationSource.QUERY:
          rawData = c.queries; // Use new getter for all query params
          break;
        default:
          throw new SystemErr(SystemErrCode.INTERNAL_SERVER_ERR, "Unknown validation source");
      }
    } catch (e: any) {
        // If parsing fails (e.g. invalid JSON syntax), throw immediately
        throw e;
    }

    // 2. Instantiate the Class with the derived data
    const instance = new TargetClass(rawData);

    // 3. Run the Class's validation logic
    try {
      await instance.validate();
    } catch (e: any) {
      // Handle Zod Errors specifically to format them nicely
      if (e instanceof z.ZodError) {
        const errorMessages = e.issues
          .map((err: any) => `${err.path.join(".")}: ${err.message}`)
          .join(", ");
        throw new SystemErr(
          SystemErrCode.BODY_PARSING_FAILED,
          `Validation Failed: ${errorMessages}`
        );
      }

      // Handle generic errors thrown manually
      throw new SystemErr(
        SystemErrCode.BODY_PARSING_FAILED,
        e.message || "Validation failed"
      );
    }

    // 4. Store the validated class instance using the Class as the key
    c.setValid(TargetClass, instance);

    await next();
  });
};