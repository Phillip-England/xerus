// PATH: /home/jacex/src/xerus/examples/10_validation.ts
import { Xerus } from "../src/Xerus";
import { Route } from "../src/Route";
import { Source } from "../src/ValidationSource";
import type { TypeValidator } from "../src/TypeValidator";
import type { HTTPContext } from "../src/HTTPContext";

const app = new Xerus();

// Define validation ONCE on the type
class CreateUser implements TypeValidator {
  username: string;
  email: string;
  age: number;

  constructor(raw: any) {
    this.username = String(raw?.username ?? "");
    this.email = String(raw?.email ?? "");
    this.age = typeof raw?.age === "number" ? raw.age : Number(raw?.age ?? NaN);
  }

  async validate(_c: HTTPContext) {
    if (this.username.trim().length < 3) throw new Error("username must be at least 3 characters");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) throw new Error("invalid email");
    if (!Number.isFinite(this.age) || this.age < 18) throw new Error("age must be >= 18");
  }
}

app.mount(
  new Route("POST", "/users", async (c, data) => {
    const user = data.get<CreateUser>(CreateUser); // stored under the ctor key
    c.json({
      message: "User created",
      user,
    });
  }).validate(Source.JSON(), CreateUser),
);

console.log("POST /users with JSON body");
await app.listen(8080);
