import { spawn } from "node:child_process";
import { WebSocketServer } from "ws";

const ffmpegPath = process.env.FFMPEG_PATH || "ffmpeg";

function redact(text, streamKey) {
  return streamKey ? text.replaceAll(streamKey, "[redacted]") : text;
}

export function createIngestWss() {
  const wss = new WebSocketServer({ noServer: true });

  wss.on("connection", (ws) => {
    let ffmpeg = null;
    let configured = false;

    function sendError(message) {
      if (ws.readyState === 1) {
        ws.send(JSON.stringify({ type: "error", message }));
      }
    }

    function cleanup() {
      const child = ffmpeg;
      ffmpeg = null;
      if (!child) return;
      try {
        child.stdin.end();
      } catch {}
      if (child.exitCode === null && !child.killed) child.kill("SIGTERM");
      ws.resume();
    }

    ws.on("message", (data, isBinary) => {
      if (!configured) {
        let message;
        try {
          message = JSON.parse(data.toString());
        } catch {
          return;
        }
        if (message.type !== "config") return;

        const rtmpUrl =
          typeof message.rtmpUrl === "string" ? message.rtmpUrl.trim() : "";
        const streamKey =
          typeof message.streamKey === "string" ? message.streamKey.trim() : "";

        if (!/^rtmps?:\/\//i.test(rtmpUrl) || !streamKey) {
          sendError("Invalid RTMP URL or stream key.");
          ws.close(1008, "Invalid RTMP configuration");
          return;
        }

        const base = rtmpUrl.endsWith("/") ? rtmpUrl : `${rtmpUrl}/`;
        const target = `${base}${streamKey}`;

        ffmpeg = spawn(
          ffmpegPath,
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

        ffmpeg.stderr.on("data", (chunk) => {
          const text = redact(chunk.toString(), streamKey).trim();
          if (text) console.error("RTMP publisher:", text);
        });
        ffmpeg.stdin.on("error", (error) => {
          console.error("RTMP publisher stdin:", redact(error.message, streamKey));
        });
        ffmpeg.stdin.on("drain", () => {
          if (ws.readyState === 1) ws.resume();
        });
        ffmpeg.on("error", (error) => {
          console.error("RTMP publisher failed to start:", redact(error.message, streamKey));
          sendError("ffmpeg is unavailable on the ingest server.");
          cleanup();
        });
        ffmpeg.on("close", (code) => {
          if (code !== 0 && code !== null) {
            console.error("RTMP publisher exited:", code);
            sendError("The RTMP destination rejected the stream. Check the URL and stream key.");
          }
        });

        configured = true;
        return;
      }

      if (!isBinary || !ffmpeg?.stdin.writable) return;
      if (!ffmpeg.stdin.write(data)) ws.pause();
    });

    ws.on("close", cleanup);
    ws.on("error", cleanup);
  });

  return wss;
}
