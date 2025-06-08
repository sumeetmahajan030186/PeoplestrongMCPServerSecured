import express from "express";
import cors from "cors";
import { sessionTokenMiddleware } from "./middlewares/sessionTokenMiddleware.js";
import { registerOAuthRoutes } from "./routes/oauth.js";
import { registerSseRoutes } from "./routes/sse.js";
import { registerMessageRoutes } from "./routes/messages.js";
import { createMcpServer } from "./services/mcpInstance.js";

export const app = express();

app.use(cors());
app.use(express.json());
app.use(sessionTokenMiddleware);

// Creating MCP server instance and bind to app.locals so it can be accessed in routes
// initialized here to control the order of initialization
// and ensure it is created after basic setup and before any routes that might use it.
app.locals.mcp = createMcpServer();

app.get("/health", (_, res) => res.send("OK"));

registerOAuthRoutes(app);
registerSseRoutes(app);
registerMessageRoutes(app);
