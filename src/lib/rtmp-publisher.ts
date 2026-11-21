export type RtmpPublisherOptions = {
  endpoint: string;
  rtmpUrl: string;
  streamKey: string;
  onError?: (message: string) => void;
};

export function getIngestEndpoint(): string | null {
  const configured = process.env.NEXT_PUBLIC_INGEST_WS_URL;
  if (configured) return configured;
  if (typeof location === "undefined") return null;

  const hostname = location.hostname;
  const isLocal =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname === "[::1]";
  if (!isLocal) return null;

  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${location.host}/ws/ingest`;
}

function pickMimeType(hasAudio: boolean): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  const candidates = hasAudio
    ? [
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm;codecs=vp9",
        "video/webm;codecs=vp8",
        "video/webm",
      ]
    : ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? null;
}

export class RtmpPublisher {
  private ws: WebSocket | null = null;
  private recorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;

  async start(stream: MediaStream, options: RtmpPublisherOptions): Promise<void> {
    this.stop();
    const mimeType = pickMimeType(stream.getAudioTracks().length > 0);
    if (!mimeType) {
      throw new Error("WebM recording is not supported in this browser.");
    }

    const ws = new WebSocket(options.endpoint);
    this.ws = ws;
    let reportedError = false;
    const reportError = (message: string) => {
      if (reportedError) return;
      reportedError = true;
      options.onError?.(message);
      this.stop();
    };

    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        reject(new Error("The ingest server did not respond. Check NEXT_PUBLIC_INGEST_WS_URL."));
      }, 10000);
      ws.onopen = () => {
        window.clearTimeout(timeout);
        ws.onmessage = (event) => {
          let message;
          try {
            message = JSON.parse(event.data.toString());
          } catch {
            return;
          }
          if (message.type !== "error") return;
          reportError(
            typeof message.message === "string" ? message.message : "RTMP publishing failed.",
          );
        };
        ws.onerror = () =>
          reportError(
            "RTMP connection error. Check NEXT_PUBLIC_INGEST_WS_URL and that the ingest server is running.",
          );
        ws.onclose = () => {
          if (this.ws !== ws) return;
          this.ws = null;
          if (this.recorder && this.recorder.state !== "inactive") {
            try {
              this.recorder.stop();
            } catch {}
          }
          reportError("The ingest server closed the connection.");
        };
        resolve();
      };
      ws.onerror = () => {
        window.clearTimeout(timeout);
        reject(
          new Error(
            "Could not connect to the ingest server. Check NEXT_PUBLIC_INGEST_WS_URL and that the ingest server is reachable.",
          ),
        );
      };
    });

    ws.send(
      JSON.stringify({
        type: "config",
        rtmpUrl: options.rtmpUrl,
        streamKey: options.streamKey,
      }),
    );

    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 8_000_000,
      audioBitsPerSecond: 160_000,
    });
    this.recorder = recorder;
    this.stream = stream;
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
        ws.send(event.data);
      }
    };
    recorder.start(1000);
  }

  stop(): void {
    const recorder = this.recorder;
    this.recorder = null;
    if (recorder && recorder.state !== "inactive") {
      recorder.ondataavailable = null;
      try {
        recorder.stop();
      } catch {}
    }

    const ws = this.ws;
    this.ws = null;
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      ws.close();
    }
    this.stream = null;
  }
}
