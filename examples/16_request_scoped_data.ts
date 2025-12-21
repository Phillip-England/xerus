import { Xerus } from "../src/Xerus";
import { XerusRoute } from "../src/XerusRoute";
import { Method } from "../src/Method";
import { Middleware } from "../src/Middleware";
import { HTTPContext } from "../src/HTTPContext";

const app = new Xerus();

// 1. Define middleware that attaches data to the request context
const attachUser = new Middleware(async (c: HTTPContext, next) => {
  const user = { id: 1, role: "admin", name: "Jace" };
  
  // Storing data in c.data via setStore
  c.setStore("user", user);
  
  await next();
});

// 2. Define the route as a class
class MeRoute extends XerusRoute {
  method = Method.GET;
  path = "/me";

  onMount() {
    // Attach the middleware to this specific route
    this.use(attachUser);
  }

  async handle(c: HTTPContext) {
    // Retrieve the user object previously stored by the middleware
    const user = c.getStore("user");
    
    c.json({ 
      message: "User retrieved from context store", 
      user 
    });
  }
}

// 3. Mount the class blueprint
app.mount(MeRoute);

console.log("🚀 Request Scoped Data example running on http://localhost:8080/me");
await app.listen(8080);