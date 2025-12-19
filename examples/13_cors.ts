import { Xerus } from "../src/Xerus";
import { cors } from "../src/Middleware";

const app = new Xerus();

// Allow all origins (default)
app.use(cors());

app.get("/public", async (c) => {
  c.json({ message: "CORS enabled for everyone 🌍" });
});

// Restricted CORS
app.get(
  "/restricted",
  async (c) => {
    c.json({ secure: true });
  },
  cors({
    origin: "https://example.com",
    methods: ["GET"],
    credentials: true,
  }),
);

console.log("CORS demo running on http://localhost:8080");
await app.listen(8080);
