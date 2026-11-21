import { createServer } from "node:http";
import next from "next";
import { WebSocketServer } from "ws";

const port = Number.parseInt(process.env.PORT || "3000", 10);
const hostname = process.env.HOST || "0.0.0.0";
const dev = process.env.NODE_ENV !== "production";

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const rooms = new Map();
const wss = new WebSocketServer({ noServer: true });

function getRoom(roomId) {
  let room = rooms.get(roomId);
  if (!room) {
    room = new Set();
    rooms.set(roomId, room);
  }
  return room;
}

wss.on("connection", (ws) => {
  const joinedRooms = new Set();

  ws.on("message", (data) => {
    let message;
    try {
      message = JSON.parse(data.toString());
    } catch {
      return;
    }
    if (typeof message.roomId !== "string" || !message.roomId) return;

    const room = getRoom(message.roomId);
    room.add(ws);
    joinedRooms.add(message.roomId);

    const payload = JSON.stringify(message);
    for (const client of room) {
      if (client !== ws && client.readyState === 1) client.send(payload);
    }
  });

  ws.on("close", () => {
    for (const roomId of joinedRooms) {
      const room = rooms.get(roomId);
      if (!room) continue;
      room.delete(ws);
      if (room.size === 0) rooms.delete(roomId);
    }
  });
});

const server = createServer((req, res) => {
  handle(req, res);
});

server.on("upgrade", (req, socket, head) => {
  let pathname;
  try {
    pathname = new URL(req.url || "/", "http://localhost").pathname;
  } catch {
    return;
  }
  if (pathname === "/ws/local") {
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  }
});

app.prepare().then(() => {
  server.listen(port, hostname, () => {
    console.log(
      `> Server listening at http://localhost:${port} as ${
        dev ? "development" : process.env.NODE_ENV
      }`,
    );
    console.log("> WebSocket relay listening on /ws/local");
  });
});
