import { z } from "zod";
import { Xerus } from "../../src/Xerus";
import { HTTPContext } from "../../src/HTTPContext";
import { Validator } from "../../src/Validator";
import type { TypeValidator } from "../../src/TypeValidator";

// 1. Define the Validator Class
class UserSignupRequest implements TypeValidator {
  username: string;
  email: string;
  age: number;

  constructor(data: any) {
    // We assign raw data here. 
    // Types aren't guaranteed until validate() passes.
    this.username = data.username;
    this.email = data.email;
    this.age = data.age;
  }

  async validate() {
    // Define Zod schema
    const schema = z.object({
      username: z.string().min(3, "Username must be at least 3 chars"),
      email: z.string().email("Invalid email format"),
      age: z.number().min(18, "Must be 18 or older"),
    });

    // Run validation against 'this' instance
    await schema.parseAsync(this);
  }
}

// 2. Define the Route Module
export function validation(app: Xerus) {
  
  app.post(
    "/validation/signup", 
    async (c: HTTPContext) => {
      // Retrieve the strongly typed, validated instance
      const validRequest = c.getValid<UserSignupRequest>();

      c.json({
        status: "success",
        user: {
          name: validRequest.username,
          email: validRequest.email,
          age: validRequest.age
        }
      });
    }
  , Validator(UserSignupRequest));

  // Test for Manual Error Throwing (non-Zod)
  class ManualValidator implements TypeValidator {
    code: string;
    constructor(data: any) { this.code = data.code; }
    
    validate() {
      if (this.code !== "secret") {
        throw new Error("Invalid secret code");
      }
    }
  }

  app.post("/validation/manual", async (c) => {
    c.json({ access: "granted" });
  }, Validator(ManualValidator));
}