import { spawn } from "node:child_process";
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
const ingestWss = new WebSocketServer({ noServer: true });

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

ingestWss.on("connection", (ws) => {
  let ffmpeg = null;
  let configured = false;

  function cleanup() {
    if (!ffmpeg) return;
    try {
      ffmpeg.stdin.end();
    } catch {}
    if (ffmpeg.exitCode === null) ffmpeg.kill("SIGTERM");
    ffmpeg = null;
  }

  ws.on("message", (data) => {
    if (!configured) {
      let message;
      try {
        message = JSON.parse(data.toString());
      } catch {
        return;
      }
      if (message.type !== "config") return;

      const rtmpUrl = typeof message.rtmpUrl === "string" ? message.rtmpUrl.trim() : "";
      const streamKey =
        typeof message.streamKey === "string" ? message.streamKey.trim() : "";
      if (!rtmpUrl || !streamKey) {
        ws.close(1008, "Missing RTMP configuration");
        return;
      }

      const base = rtmpUrl.endsWith("/") ? rtmpUrl : `${rtmpUrl}/`;
      const target = `${base}${streamKey}`;
      ffmpeg = spawn(
        "ffmpeg",
        [
          "-hide_banner",
          "-loglevel",
          "error",
          "-fflags",
          "+genpts+igndts",
          "-f",
          "webm",
          "-i",
          "pipe:0",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-tune",
        "zerolatency",
        "-crf",
        "18",
        "-maxrate",
        "8000k",
        "-bufsize",
        "16000k",
        "-profile:v",
        "high",
        "-level",
        "4.1",
        "-pix_fmt",
        "yuv420p",
        "-g",
        "50",
        "-keyint_min",
        "25",
        "-c:a",
        "aac",
        "-b:a",
        "160k",
        "-ar",
        "44100",
          "-f",
          "flv",
          target,
        ],
        { stdio: ["pipe", "ignore", "pipe"] },
      );
      function sendError(message) {
        if (ws.readyState === 1) {
          ws.send(JSON.stringify({ type: "error", message }));
        }
      }

      ffmpeg.stderr.on("data", (chunk) => {
        const text = chunk.toString().replaceAll(streamKey, "[redacted]").trim();
        if (text) console.error("RTMP publisher:", text);
      });
      ffmpeg.on("error", () => sendError("ffmpeg is unavailable on the ingest server."));
      ffmpeg.on("close", (code) => {
        if (code !== 0 && code !== null) {
          console.error("RTMP publisher exited:", code);
          sendError("The RTMP destination rejected the stream. Check the URL and stream key.");
        }
      });
      configured = true;
      return;
    }

    if (ffmpeg?.stdin.writable) ffmpeg.stdin.write(data);
  });

  ws.on("close", cleanup);
  ws.on("error", cleanup);
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
    return;
  }
  if (pathname === "/ws/ingest") {
    ingestWss.handleUpgrade(req, socket, head, (ws) => {
      ingestWss.emit("connection", ws, req);
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
    console.log("> RTMP ingest listening on /ws/ingest");
  });
});
