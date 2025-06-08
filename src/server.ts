import { app } from "./app.js";
import { loadEnv } from "./config/env.js";

loadEnv();

const port = Number(process.env.PORT || 3000);
app.listen(port, "0.0.0.0", () =>
  console.log(`✅ SSE MCP server (OAuth) on port ${port}`)
);
