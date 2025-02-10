import express from "express";

const app = express();
const PORT = process.env.PORT || 8000;

// Logger middleware to track request duration
app.use((req, res, next) => {
  const start = process.hrtime(); // Start timer

  res.on("finish", () => {
    const [seconds, nanoseconds] = process.hrtime(start);
    const durationMs = (seconds * 1000 + nanoseconds / 1e6).toFixed(2);
    console.log(`[${req.method}] ${req.url} - ${res.statusCode} - ${durationMs}ms`);
  });

  next();
});

app.get("/", (req, res) => {
  res.send("Hello, World from Bun!");
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
