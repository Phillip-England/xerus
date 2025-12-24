import { z } from "zod";
import { Xerus } from "../../src/Xerus";
import { XerusRoute } from "../../src/XerusRoute";
import { Method } from "../../src/Method";
import { BodyType } from "../../src/BodyType";
import { HTTPContext } from "../../src/HTTPContext";
import type { TypeValidator } from "../../src/TypeValidator";
import { parseBody } from "../../src/std/Body";
import { query } from "../../src/std/Request";
import { json } from "../../src/std/Response";

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
  async validate(c: HTTPContext) {
    const raw = await parseBody(c, BodyType.JSON);
    const data = await signupSchema.parseAsync(raw);
    return { data };
  }
}

class SearchValidator implements TypeValidator {
  async validate(c: HTTPContext) {
    const prepared = {
      q: query(c, "q") || "",
      limit: Number(query(c, "limit") || "10"),
    };
    const data = await searchSchema.parseAsync(prepared);
    return { data };
  }
}

class LoginValidator implements TypeValidator {
  async validate(c: HTTPContext) {
    const raw = await parseBody(c, BodyType.FORM);
    const data = await loginSchema.parseAsync(raw);
    return { data };
  }
}

class SignupRoute extends XerusRoute {
  method = Method.POST;
  path = "/validation/signup";
  validators = [SignupValidator];

  async handle(c: HTTPContext) {
    const { data } = c.validated(SignupValidator);
    const { username, email, age } = data;

    json(c, {
      status: "success",
      user: { name: username, email, age },
    });
  }
}

class SearchRoute extends XerusRoute {
  method = Method.GET;
  path = "/validation/search";
  validators = [SearchValidator];

  async handle(c: HTTPContext) {
    const { data } = c.validated(SearchValidator);
    json(c, {
      status: "success",
      search: { q: data.q, limit: data.limit },
    });
  }
}

class LoginRoute extends XerusRoute {
  method = Method.POST;
  path = "/validation/login";
  validators = [LoginValidator];

  async handle(c: HTTPContext) {
    const { data } = c.validated(LoginValidator);
    json(c, {
      status: "success",
      msg: `Welcome ${data.username}`,
    });
  }
}

export function validation(app: Xerus) {
  app.mount(SignupRoute, SearchRoute, LoginRoute);
}
