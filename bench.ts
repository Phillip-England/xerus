import { spawn } from "bun";

// --- Configuration ---
const PORT = 8080;
const DURATION = "15s"; // Shared duration for all tests
const THREADS = "4";    // wrk threads per test
const CONNS = "100";    // Connections per test (Total concurrency = CONNS * Test Count)

// --- The Benchmark Definitions ---
const BENCHMARKS = [
  {
    name: "🔥 Raw Throughput (Root)",
    cmd: ["wrk", `-t${THREADS}`, `-c${CONNS}`, `-d${DURATION}`, `http://localhost:${PORT}/`]
  },
  {
    name: "🛣️  Routing Logic (Param)",
    cmd: ["wrk", `-t${THREADS}`, `-c${CONNS}`, `-d${DURATION}`, `http://localhost:${PORT}/users/12345`]
  },
  {
    name: "💾 Embedded Assets (Memory)",
    cmd: ["wrk", `-t${THREADS}`, `-c${CONNS}`, `-d${DURATION}`, `http://localhost:${PORT}/static-site/index.html`]
  },
  {
    name: "💿 Static Assets (Disk)",
    cmd: ["wrk", `-t${THREADS}`, `-c${CONNS}`, `-d${DURATION}`, `http://localhost:${PORT}/disk-src/Xerus.ts`]
  },
  {
    name: "📦 JSON Parsing (POST)",
    script: `wrk.method = "POST"; wrk.body = "{\\"name\\": \\"Benchmark Item\\"}"; wrk.headers["Content-Type"] = "application/json"`,
    cmd: ["wrk", `-t${THREADS}`, `-c${CONNS}`, `-d${DURATION}`, "-s", "temp_post.lua", `http://localhost:${PORT}/items`]
  },
  // --- NEW: OBJECT POOL STRESS TEST ---
  // Hits an endpoint that forces context mutation (query params + store) to ensure reset() is working under load
  {
    name: "🏊 Object Pool Churn",
    cmd: ["wrk", `-t${THREADS}`, `-c${CONNS}`, `-d${DURATION}`, `http://localhost:${PORT}/pool/set?val=stress_test_value`]
  }
];

// --- Helper: ANSI Colors ---
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  red: "\x1b[31m",
  bold: "\x1b[1m",
};

async function main() {
  console.log(`${colors.bold}${colors.cyan}🚀 Starting Xerus Benchmark Suite${colors.reset}`);

  // 1. Start the Server
  console.log(`${colors.yellow}👉 Spawning Server (servers/http/server.ts)...${colors.reset}`);
  const serverProc = spawn(["bun", "run", "./servers/http/server.ts"], {
    stdout: "ignore", // Silence server logs to keep bench output clean
    stderr: "inherit",
  });

  // 2. Wait for Port 8080 to be ready
  let retries = 0;
  while (true) {
    try {
      await fetch(`http://localhost:${PORT}`);
      console.log(`${colors.green}✅ Server is UP on port ${PORT}${colors.reset}`);
      break;
    } catch (e) {
      if (retries > 20) {
        console.error(`${colors.red}❌ Server failed to start.${colors.reset}`);
        serverProc.kill();
        process.exit(1);
      }
      await new Promise((r) => setTimeout(r, 200));
      retries++;
    }
  }

  console.log(`${colors.bold}⚡ Running ${BENCHMARKS.length} benchmarks in PARALLEL...${colors.reset}`);
  console.log(`   (Total simulated clients: ${BENCHMARKS.length * parseInt(CONNS)})`);
  console.log("---------------------------------------------------");

  // 3. Prepare Lua scripts if needed
  for (const bench of BENCHMARKS) {
    if (bench.script) {
      await Bun.write("temp_post.lua", bench.script);
    }
  }

  // 4. Run All wrk processes simultaneously
  const promises = BENCHMARKS.map(async (bench) => {
    const proc = spawn(bench.cmd, { stdout: "pipe" });
    const output = await new Response(proc.stdout).text();
    await proc.exited;
    return { name: bench.name, output };
  });

  const results = await Promise.all(promises);

  // 5. Cleanup
  serverProc.kill();
  await Bun.write("temp_post.lua", ""); // Clear temp file
  console.log(`${colors.yellow}🛑 Server stopped.${colors.reset}\n`);

  // 6. Parse and Display Results
  console.log(`${colors.bold}📊 BENCHMARK RESULTS${colors.reset}`);
  console.log("---------------------------------------------------");
  
  // Simple regex to grab Requests/sec
  const reqSecRegex = /Requests\/sec:\s+([\d\.]+)/;
  const latRegex = /Latency\s+([\d\.]+)(\w+)/;

  results.forEach((res) => {
    const reqMatch = res.output.match(reqSecRegex);
    const latMatch = res.output.match(latRegex);
    
    const rps = reqMatch ? reqMatch[1] : "ERR";
    const lat = latMatch ? `${latMatch[1]}${latMatch[2]}` : "ERR";

    console.log(`Test: ${colors.cyan}${res.name.padEnd(30)}${colors.reset} | RPS: ${colors.green}${rps.padEnd(10)}${colors.reset} | Latency: ${colors.yellow}${lat}${colors.reset}`);
  });
  console.log("---------------------------------------------------");
}

main();