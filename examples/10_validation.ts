import { Xerus } from "../src/Xerus";
import { HTTPContext } from "../src/HTTPContext";
import { Validator } from "../src/Validator";
import { z } from "zod";

// 1. Define a Validation Class using Zod
class CreateUserRequest {
  // Zod Schema
  static schema = z.object({
    username: z.string().min(3),
    email: z.string().email(),
    age: z.number().min(18)
  });

  public username: string;
  public email: string;
  public age: number;

  constructor(data: any) {
    this.username = data.username;
    this.email = data.email;
    this.age = data.age;
  }

  // Required validate() method
  validate() {
    CreateUserRequest.schema.parse(this);
  }
}

// 2. Define a separate validator (e.g., for metadata)
class MetadataRequest {
    static schema = z.object({
        source: z.string()
    });
    public source: string;
    constructor(data: any) { this.source = data.source; }
    validate() { MetadataRequest.schema.parse(this); }
}

const app = new Xerus();

// 3. Register Route with Validation Middleware
// We no longer need to invent string keys like "user_body" or "meta"
app.post(
  "/users",
  async (c: HTTPContext) => {
    // 4. Retrieve Validated Data by Class
    // The type of 'user' is automatically 'CreateUserRequest'
    const user = c.getValid(CreateUserRequest);
    const meta = c.getValid(MetadataRequest);

    return c.json({
      message: "User created",
      user: {
        name: user.username,
        email: user.email,
      },
      source: meta.source
    });
  },    
  Validator(CreateUserRequest),
  Validator(MetadataRequest),    
);

console.log("Try sending POST to /users with JSON body");
await app.listen(8080);