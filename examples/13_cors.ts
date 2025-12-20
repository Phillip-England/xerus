import { Xerus } from "../src/Xerus";
import { Route } from "../src/Route";
import { cors } from "../src/Middleware";

const app = new Xerus();

app.use(cors());

app.mount(
  new Route("GET", "/public", async (c) => {
    c.json({ message: "CORS enabled for everyone 🌍" });
  }),

  new Route("GET", "/restricted", async (c) => {
    c.json({ secure: true });
  }).use(
    cors({
      origin: "https://example.com",
      methods: ["GET"],
      credentials: true,
    }),
  ),
);

await app.listen(8080);
