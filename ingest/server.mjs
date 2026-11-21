import { createServer } from "node:http";
import { createIngestWss } from "./ingest-handler.mjs";

const port = Number.parseInt(process.env.PORT || "3001", 10);
const wss = createIngestWss();

const server = createServer((req, res) => {
  let pathname;
  try {
    pathname = new URL(req.url || "/", "http://localhost").pathname;
  } catch {
    res.writeHead(400);
    res.end();
    return;
  }

  if (pathname === "/" || pathname === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
    return;
  }

  res.writeHead(404);
  res.end();
});

server.on("upgrade", (req, socket, head) => {
  let pathname;
  try {
    pathname = new URL(req.url || "/", "http://localhost").pathname;
  } catch {
    socket.destroy();
    return;
  }
  if (pathname !== "/ws/ingest") {
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit("connection", ws, req);
  });
});

function shutdown() {
  for (const client of wss.clients) client.terminate();
  server.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

server.listen(port, "0.0.0.0", () => {
  console.log(`> Ingest server listening on 0.0.0.0:${port}`);
  console.log("> RTMP ingest listening on /ws/ingest");
});
