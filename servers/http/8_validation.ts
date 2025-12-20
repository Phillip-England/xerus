import { z } from "zod";
import { Xerus } from "../../src/Xerus";
import { HTTPContext } from "../../src/HTTPContext";
import { Validator } from "../../src/Validator";
import { Source } from "../../src/ValidationSource"; // Updated import name
import type { TypeValidator } from "../../src/TypeValidator";

// --- VALIDATOR CLASSES ---

// 1. JSON Body Validator
class UserSignupRequest implements TypeValidator {
  username: string;
  email: string;
  age: number;

  constructor(data: any) {
    this.username = data.username;
    this.email = data.email;
    this.age = data.age;
  }

  async validate() {
    const schema = z.object({
      username: z.string().min(3, "Username must be at least 3 chars"),
      email: z.email("Invalid email format"),
      age: z.number().min(18, "Must be 18 or older"),
    });
    await schema.parseAsync(this);
  }
}

// 2. Query Parameter Validator
class SearchRequest implements TypeValidator {
  query: string;
  limit: number;

  constructor(data: any) {
    // Expected input: The entire query object (e.g., { q: "...", limit: "..." })
    this.query = data.q || "";
    this.limit = Number(data.limit) || 10;
  }

  async validate() {
    const schema = z.object({
      query: z.string().min(1, "Search query is required"),
      limit: z.number().max(100, "Limit cannot exceed 100"),
    });
    await schema.parseAsync(this);
  }
}

// 3. Form Data Validator
class LoginRequest implements TypeValidator {
  user: string;
  pass: string;

  constructor(data: any) {
    // parseBody(FORM) returns a simple object Record<string, string>
    this.user = data.username;
    this.pass = data.password;
  }

  async validate() {
    if(!this.user || !this.pass) throw new Error("Missing credentials");
    if(this.pass.length < 6) throw new Error("Password too short");
  }
}


// --- ROUTES ---

export function validation(app: Xerus) {
  
  // JSON Validation (Default)
  app.post(
    "/validation/signup", 
    async (c: HTTPContext) => {
      const validRequest = c.getValid(UserSignupRequest);
      c.json({
        status: "success",
        user: { 
          name: validRequest.username, 
          email: validRequest.email,
          age: validRequest.age
        }
      });
    },
    Validator(UserSignupRequest, Source.JSON)
  );

  // Query Param Validation
  // Updated: We call Source.QUERY() without args to get ALL query params
  app.get(
    "/validation/search",
    async (c: HTTPContext) => {
      const validReq = c.getValid(SearchRequest);
      c.json({
        status: "success",
        search: { q: validReq.query, limit: validReq.limit }
      });
    },
    Validator(SearchRequest, Source.QUERY())
  );

  // Form Data Validation
  app.post(
    "/validation/login",
    async (c: HTTPContext) => {
      const validReq = c.getValid(LoginRequest);
      c.json({
        status: "success",
        msg: `Welcome ${validReq.user}`
      });
    },
    Validator(LoginRequest, Source.FORM)
  );
}