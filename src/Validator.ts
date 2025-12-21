import type { HTTPContext } from "./HTTPContext";
import { BodyType } from "./BodyType";
import { SystemErr } from "./SystemErr";
import { SystemErrCode } from "./SystemErrCode";
import type { ValidationSource } from "./ValidationSource";
import type { TypeValidator } from "./TypeValidator";
import { Middleware } from "./Middleware";

type Ctor<T> = new (raw: any) => T;

async function readSource(c: HTTPContext, source: ValidationSource): Promise<any> {
  switch (source.kind) {
    case "JSON":
      return await c.parseBody(BodyType.JSON);
    case "FORM":
      return await c.parseBody(BodyType.FORM, { formMode: source.formMode ?? "last" });
    case "QUERY":
      return source.key ? c.query(source.key, "") : c.queries;
    case "PARAM":
      return source.key ? c.getParam(source.key, "") : c.params;
    case "WSMESSAGE":
      return c._wsMessage;
    case "CUSTOM":
      return await source.provider(c);
  }
}

export class Validator<T extends TypeValidator = any> {
  readonly source: ValidationSource;
  readonly Type: Ctor<T>;
  readonly storeKey: string;

  constructor(source: ValidationSource, Type: Ctor<T>, storeKey?: string) {
    this.source = source;
    this.Type = Type;
    this.storeKey = storeKey ?? Type.name;
  }

  static from<T extends TypeValidator>(
    source: ValidationSource,
    Type: Ctor<T>,
    storeKey?: string,
  ): Validator<T> {
    return new Validator(source, Type, storeKey);
  }

  asMiddleware(): Middleware<any> {
    return new Middleware<any>(async (c, next) => {
      try {
        const raw = await readSource(c, this.source);
        const instance = new this.Type(raw);
        if (typeof (instance as any)?.validate !== "function") {
          throw new SystemErr(
            SystemErrCode.VALIDATION_FAILED,
            `Type "${this.Type.name}" does not implement validate(c)`,
          );
        }
        await instance.validate(c);
        (c.data as any)[this.storeKey] = instance;
        await next();
      } catch (e: any) {
        if (e instanceof SystemErr) throw e;
        throw new SystemErr(SystemErrCode.VALIDATION_FAILED, e?.message ?? "Validation failed");
      }
    });
  }
}