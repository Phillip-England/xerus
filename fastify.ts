import Fastify from "fastify";

// Create a Fastify instance
const fastify = Fastify();

// Basic logger middleware
fastify.addHook("onRequest", (request, reply, done) => {
  console.log(`[${new Date().toISOString()}] ${request.method} ${request.url}`);
  done();
});

// Define a basic route
fastify.get("/", async (request, reply) => {
  return { message: "Hello, World!" };
});

// Start the server
const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: "0.0.0.0" });
    console.log("Server is running on http://localhost:3000");
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

start();