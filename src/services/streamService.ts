import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";

const streamMap = new Map<string, SSEServerTransport>();
const timeouts = new Map<string, NodeJS.Timeout>();

export function registerStream(
  transport: SSEServerTransport,
  onCleanup?: () => void
): boolean {
  // preventing DOS attacks by limiting the number of connections
  const maxConnections = Number(process.env.MAX_CONNECTIONS || 1000);
  if (streamMap.size > maxConnections) {
    console.error("Too many connections, rejecting new session");
    return false;
  }
  const sessionId = transport.sessionId;

  // Clear any existing timeout first
  clearTimeout(timeouts.get(sessionId));

  // Set the stream
  streamMap.set(sessionId, transport);

  // 15-minute cleanup timeout
  const timeout = setTimeout(() => {
    cleanupSession(sessionId, "timeout", undefined, onCleanup);
    transport.close?.();
  }, 15 * 60 * 1000);

  timeouts.set(sessionId, timeout);

  transport.onclose = () =>
    cleanupSession(sessionId, "client closed", undefined, onCleanup);
  transport.onerror = (err) =>
    cleanupSession(sessionId, "transport error", err, onCleanup);

  return true;
}

export function getStream(sessionId: string): SSEServerTransport | undefined {
  return streamMap.get(sessionId);
}

function cleanupSession(
  sessionId: string,
  reason: string,
  error?: unknown,
  onCleanup?: () => void
) {
  clearTimeout(timeouts.get(sessionId));
  streamMap.delete(sessionId);
  timeouts.delete(sessionId);
  onCleanup?.();
  if (error) {
    console.error(`Stream error: ${sessionId} — ${reason}`, error);
  } else {
    console.warn(`Stream removed: ${sessionId} — ${reason}`);
  }
}
