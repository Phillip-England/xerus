import { Xerus } from "../src/Xerus";
import { Route } from "../src/Route";
import { Source } from "../src/ValidationSource";
import type { TypeValidator } from "../src/TypeValidator";
import { z } from "zod";

const app = new Xerus();

class CreateUserBody implements TypeValidator {
  username: string;
  email: string;
  age: number;

  constructor(d: any) {
    this.username = d?.username;
    this.email = d?.email;
    this.age = d?.age;
  }

  async validate() {
    const schema = z.object({
      username: z.string().min(3),
      email: z.string().email(),
      age: z.number().min(18),
    });
    await schema.parseAsync(this);
  }
}

const createUser = new Route("POST", "/users", async (c, data) => {
  const user = data.get(CreateUserBody);

  c.json({
    message: "User created",
    user: { name: user.username, email: user.email },
  });
}).validate(CreateUserBody, Source.JSON);

app.mount(createUser);

console.log("Try sending POST to /users with JSON body");
await app.listen(8080);
