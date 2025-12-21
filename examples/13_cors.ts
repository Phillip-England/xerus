import { Xerus } from "../src/Xerus";
import { XerusRoute } from "../src/XerusRoute";
import { Method } from "../src/Method";
import { cors } from "../src/Middleware";
import { HTTPContext } from "../src/HTTPContext";

const app = new Xerus();

// 1. Apply global CORS (Allow all by default)
app.use(cors());

// 2. Public Route (Inherits global CORS)
class PublicRoute extends XerusRoute {
  method = Method.GET;
  path = "/public";

  async handle(c: HTTPContext) {
    c.json({ message: "CORS enabled for everyone 🌍" });
  }
}

// 3. Restricted Route (Uses specific CORS config)
class RestrictedRoute extends XerusRoute {
  method = Method.GET;
  path = "/restricted";

  onMount() {
    // This route-specific middleware will execute after the global one
    this.use(
      cors({
        origin: "https://example.com",
        methods: ["GET"],
        credentials: true,
      }),
    );
  }

  async handle(c: HTTPContext) {
    c.json({ secure: true });
  }
}

// 4. Mount the class blueprints
app.mount(PublicRoute, RestrictedRoute);

console.log("🚀 CORS example running on http://localhost:8080");
await app.listen(8080);