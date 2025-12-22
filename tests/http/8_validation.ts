import { z } from "zod";
import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import { BodyType } from "../../src/BodyType";
import { HTTPContext } from "../../src/HTTPContext";
import { Validator } from "../../src/Validator";
import { Source } from "../../src/ValidationSource";
import type { TypeValidator } from "../../src/TypeValidator";

const signupSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 chars"),
  email: z.string().email("Invalid email format"),
  age: z.number().min(18, "Must be 18 or older"),
});

const searchSchema = z.object({
  q: z.string().min(1, "Search query is required"),
  limit: z.number().max(100, "Limit cannot exceed 100"),
});

const loginSchema = z.object({
  username: z.string().min(1, "Missing credentials"),
  password: z.string().min(6, "Password too short"),
});

class SignupValidator implements TypeValidator {
  data!: z.infer<typeof signupSchema>;
  constructor(public raw: any) {}
  async validate(c: HTTPContext) {
    this.data = await signupSchema.parseAsync(this.raw);
  }
}

class SearchValidator implements TypeValidator {
  data!: z.infer<typeof searchSchema>;
  constructor(public raw: any) {}
  async validate(c: HTTPContext) {
    const prepared = {
      // FIX: Default to "" so Zod checks .min(1) instead of throwing "Required"
      q: this.raw.q || "",
      limit: Number(this.raw.limit || 10),
    };
    this.data = await searchSchema.parseAsync(prepared);
  }
}

class LoginValidator implements TypeValidator {
  data!: z.infer<typeof loginSchema>;
  constructor(public raw: any) {}
  async validate(c: HTTPContext) {
    this.data = await loginSchema.parseAsync(this.raw);
  }
}

class SignupRoute extends XerusRoute {
  method = Method.POST;
  path = "/validation/signup";

  body = Validator.Param(Source.JSON(), SignupValidator);

  async handle(c: HTTPContext) {
    const { username, email, age } = this.body.data;
    c.json({
      status: "success",
      user: { name: username, email, age },
    });
  }
}

class SearchRoute extends XerusRoute {
  method = Method.GET;
  path = "/validation/search";

  query = Validator.Param(Source.QUERY(), SearchValidator);

  async handle(c: HTTPContext) {
    c.json({
      status: "success",
      search: { q: this.query.data.q, limit: this.query.data.limit },
    });
  }
}

class LoginRoute extends XerusRoute {
  method = Method.POST;
  path = "/validation/login";

  form = Validator.Param(Source.FORM(), LoginValidator);

  async handle(c: HTTPContext) {
    c.json({
      status: "success",
      msg: `Welcome ${this.form.data.username}`,
    });
  }
}

export function validation(app: Xerus) {
  app.mount(SignupRoute, SearchRoute, LoginRoute);
}
