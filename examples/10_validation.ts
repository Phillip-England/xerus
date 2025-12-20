import { Xerus } from "../src/Xerus";
import { Route } from "../src/Route";
import { z } from "zod";

const app = new Xerus();

// Create a Route
const createUser = new Route("POST", "/users", async (c) => {
    // 3. Access Validated Data
    // "validJSON" is automatically populated by the validateJSON method
    const user = c.validJSON;

    return c.json({
      message: "User created",
      user: {
        name: user.username,
        email: user.email,
      }
    });
});

// 2. Add Validation Logic
// This replaces the old class-based middleware.
// You get the raw data, and return the clean data.
createUser.validateJSON(async (data) => {
    // You can use Zod, plain JS, or any library here.
    const schema = z.object({
        username: z.string().min(3),
        email: z.string().email(),
        age: z.number().min(18)
    });
    
    // If this throws, the request stops and sends a 400 error.
    return await schema.parseAsync(data);
});

// Mount the route
app.mount(createUser);

console.log("Try sending POST to /users with JSON body");
await app.listen(8080);