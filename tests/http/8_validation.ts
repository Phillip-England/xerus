import { z } from "zod";
import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import { BodyType } from "../../src/BodyType";
import { HTTPContext } from "../../src/HTTPContext";
import { Validator } from "../../src/Validator";
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
  async validate(c: HTTPContext) {
    const raw = await c.parseBody(BodyType.JSON);
    this.data = await signupSchema.parseAsync(raw);
  }
}

class SearchValidator implements TypeValidator {
  data!: z.infer<typeof searchSchema>;
  async validate(c: HTTPContext) {
    const prepared = {
      q: c.query("q") || "",
      limit: Number(c.query("limit") || "10"),
    };
    this.data = await searchSchema.parseAsync(prepared);
  }
}

class LoginValidator implements TypeValidator {
  data!: z.infer<typeof loginSchema>;
  async validate(c: HTTPContext) {
    const raw = await c.parseBody(BodyType.FORM);
    this.data = await loginSchema.parseAsync(raw);
  }
}

class SignupRoute extends XerusRoute {
  method = Method.POST;
  path = "/validation/signup";
  body = Validator.Ctx(SignupValidator);
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
  query = Validator.Ctx(SearchValidator);
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
  form = Validator.Ctx(LoginValidator);
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
