import { Xerus } from "../src/Xerus";
import { Route } from "../src/Route";
import { Source } from "../src/ValidationSource";
import { Validator } from "../src/Validator";

const app = new Xerus();

app.mount(
  new Route("POST", "/users", async (c, data) => {
    const user = data.get("user");
    c.json({
      message: "User created",
      user,
    });
  }).validate(
    Source.JSON(),
    "user",
    (_c, v) =>
      v.shape({
        username: (v) => v.isString().minLength(3),
        email: (v) => v.isString().isEmail(),
        age: (v) => v.isNumber().min(18),
      }).value,
  ),
);

console.log("POST /users with JSON body");
await app.listen(8080);
