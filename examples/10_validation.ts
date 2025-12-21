import { Xerus } from "../src/Xerus";
import { XerusRoute } from "../src/XerusRoute";
import { Method } from "../src/Method";
import { BodyType } from "../src/BodyType";
import type { HTTPContext } from "../src/HTTPContext";

const app = new Xerus();

// Define a class-based route to utilize the validate() lifecycle hook
class CreateUser extends XerusRoute {
  method = Method.POST;
  path = "/users";
  
  // Property to store validated data
  private payload: { username: string; email: string; age: number } | null = null;

  async validate(c: HTTPContext) {
    const raw = await c.parseBody(BodyType.JSON);

    // 1. Basic type check
    if (!raw || typeof raw !== "object") {
      throw new Error("Invalid JSON body");
    }

    // 2. Extract and Sanitize
    const username = String(raw.username || "").trim();
    const email = String(raw.email || "").trim();
    const age = Number(raw.age);

    // 3. Manual Validation Logic
    if (username.length < 3) {
      throw new Error("username must be at least 3 characters");
    }
    if (!email.includes("@") || !email.includes(".")) {
      throw new Error("invalid email format");
    }
    if (!Number.isFinite(age) || age < 18) {
      throw new Error("age must be a number >= 18");
    }

    // 4. Store for handle()
    this.payload = { username, email, age };
  }

  async handle(c: HTTPContext) {
    // We can safely use this.payload here because validate() passed
    c.json({
      message: "User created successfully",
      user: this.payload,
    });
  }
}

app.mount(CreateUser);

console.log("POST /users with JSON body");
await app.listen(8080);