#!/usr/bin/env node
import { startServer } from "./server.js";

startServer().catch((err) => {
  console.error("Fatal error starting pages-mcp server:", err);
  process.exit(1);
});
