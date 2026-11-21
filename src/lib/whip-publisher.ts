export type WhipPublisherOptions = {
  endpoint: string;
  token?: string;
  onError?: (message: string) => void;
};

const ICE_SERVERS: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];

function waitForIceGathering(pc: RTCPeerConnection): Promise<void> {
  if (pc.iceGatheringState === "complete") return Promise.resolve();

  return new Promise((resolve) => {
    const finish = () => {
      window.clearTimeout(timeout);
      pc.removeEventListener("icegatheringstatechange", onChange);
      resolve();
    };
    const onChange = () => {
      if (pc.iceGatheringState === "complete") finish();
    };
    const timeout = window.setTimeout(finish, 5000);
    pc.addEventListener("icegatheringstatechange", onChange);
  });
}

export class WhipPublisher {
  private pc: RTCPeerConnection | null = null;
  private sessionUrl: string | null = null;

  async start(stream: MediaStream, options: WhipPublisherOptions): Promise<void> {
    this.stop();

    const endpoint = options.endpoint.trim();
    let url: URL;
    try {
      url = new URL(endpoint);
    } catch {
      throw new Error("Enter a valid WHIP URL in Settings.");
    }
    if (url.protocol !== "https:") {
      throw new Error("WHIP endpoints must use https://.");
    }

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    for (const track of stream.getTracks()) {
      pc.addTransceiver(track, { direction: "sendonly" });
    }
    if (!pc.getSenders().length) {
      pc.close();
      throw new Error("No audio or video tracks are available to publish.");
    }

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await waitForIceGathering(pc);

    const headers: Record<string, string> = { "Content-Type": "application/sdp" };
    const token = options.token?.trim();
    if (token) headers.Authorization = `Bearer ${token}`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers,
        body: pc.localDescription?.sdp ?? offer.sdp,
      });
    } catch {
      pc.close();
      throw new Error("Could not reach the WHIP endpoint. Check the URL and CORS settings.");
    }
    if (!response.ok) {
      const detail = (await response.text().catch(() => "")).trim().slice(0, 200);
      pc.close();
      throw new Error(
        `WHIP endpoint rejected the stream (${response.status})${detail ? `: ${detail}` : ""}.`,
      );
    }

    const answer = await response.text();
    try {
      await pc.setRemoteDescription({ type: "answer", sdp: answer });
    } catch {
      pc.close();
      throw new Error("The WHIP endpoint returned an invalid SDP answer.");
    }

    const location = response.headers.get("Location");
    this.sessionUrl = location ? new URL(location, url).toString() : null;
    this.pc = pc;

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed") {
        options.onError?.("The connection to the WHIP endpoint failed. Check your network and try again.");
      }
    };
    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === "failed") {
        options.onError?.("WebRTC negotiation failed. Check the WHIP endpoint and network.");
      }
    };
  }

  stop(): void {
    const sessionUrl = this.sessionUrl;
    const pc = this.pc;
    this.sessionUrl = null;
    this.pc = null;

    if (sessionUrl) void fetch(sessionUrl, { method: "DELETE" }).catch(() => {});
    if (pc) {
      pc.onconnectionstatechange = null;
      pc.oniceconnectionstatechange = null;
      pc.close();
    }
  }
}
