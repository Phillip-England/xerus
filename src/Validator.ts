import { z } from "zod";
import { Middleware } from "./Middleware";
import { HTTPContext } from "./HTTPContext";
import type { Constructable } from "./HTTPContext";
import { BodyType } from "./BodyType";
import { SystemErr } from "./SystemErr";
import { SystemErrCode } from "./SystemErrCode";
import type { TypeValidator } from "./TypeValidator";

/**
 * Validator Middleware
 * @param TargetClass The class definition to instantiate and validate.
 * @note This no longer requires a storage string key. The Class itself is the key.
 */
export const Validator = <T extends TypeValidator>(
  TargetClass: Constructable<T>
) => {
  return new Middleware(async (c: HTTPContext, next) => {
    let rawBody: any;

    // 1. Parse Raw JSON
    // Note: If you are validating Query params instead of Body, 
    // you might want to adjust how rawBody is sourced here based on another flag or check.
    try {
      rawBody = await c.parseBody(BodyType.JSON);
    } catch (e: any) {
      throw e; 
    }

    // 2. Instantiate the Class
    const instance = new TargetClass(rawBody);

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