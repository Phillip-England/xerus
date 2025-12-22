import type { HTTPContext } from "./HTTPContext";
import { BodyType } from "./BodyType";
import { SystemErr } from "./SystemErr";
import { SystemErrCode } from "./SystemErrCode";
import type { ValidationSource } from "./ValidationSource";
import type { TypeValidator } from "./TypeValidator";
import { Middleware } from "./Middleware";
import { RouteFieldValidator, RouteFieldValidatorCtx } from "./RouteFields";

type Ctor<TRaw, T> = new (raw: TRaw) => T;

async function readSource<TRaw>(
  c: HTTPContext,
  source: ValidationSource<TRaw>,
): Promise<TRaw> {
  switch (source.kind) {
    case "JSON":
      return (await c.parseBody(BodyType.JSON)) as TRaw;

    case "FORM": {
      const mode = (source as any).formMode ?? "last";
      if (mode === "multi") {
        return (await c.parseBody(BodyType.FORM, {
          formMode: "multi",
        })) as TRaw;
      }
      if (mode === "params") {
        return (await c.parseBody(BodyType.FORM, {
          formMode: "params",
        })) as TRaw;
      }
      return (await c.parseBody(BodyType.FORM, { formMode: "last" })) as TRaw;
    }

    case "QUERY":
      return (source.key ? c.query(source.key, "") : c.queries) as TRaw;

    case "PARAM":
      return (source.key ? c.getParam(source.key, "") : c.params) as TRaw;

    case "WSMESSAGE":
      return (c._wsMessage as any) as TRaw;
  }
}

export class Validator<TRaw, T extends TypeValidator<TRaw> = any> {
  readonly source: ValidationSource<TRaw>;
  readonly Type: Ctor<TRaw, T>;
  readonly storeKey: string;

  constructor(
    source: ValidationSource<TRaw>,
    Type: Ctor<TRaw, T>,
    storeKey?: string,
  ) {
    this.source = source;
    this.Type = Type;
    this.storeKey = storeKey ?? Type.name;
  }

  static Param<TRaw, T extends TypeValidator<TRaw>>(
    source: ValidationSource<TRaw>,
    Type: Ctor<TRaw, T>,
    storeKey?: string,
  ): T {
    return new RouteFieldValidator(source, Type, storeKey) as unknown as T;
  }

  async run(c: HTTPContext): Promise<T> {
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
      c.data[this.storeKey] = instance;
      return instance;
    } catch (e: any) {
      if (e instanceof SystemErr) throw e;
      throw new SystemErr(
        SystemErrCode.VALIDATION_FAILED,
        e?.message ?? "Validation failed",
      );
    }
  }

  asMiddleware(): Middleware {
    return new Middleware(async (c: HTTPContext, next) => {
      await this.run(c);
      await next();
    });
  }

  static Ctx<T extends TypeValidator<void>>(
    Type: new () => T,
    storeKey?: string,
  ): T {
    return new RouteFieldValidatorCtx(Type, storeKey) as unknown as T;
  }
}
