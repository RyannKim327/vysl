import { upgradeWebSocket } from "@vercel/functions";
import { connection } from "next/server";

type RoomClient = {
  readyState: number;
  send(data: string): void;
};

type RelayedMessage = {
  roomId?: unknown;
};

const rooms = new Map<string, Set<RoomClient>>();

export async function GET() {
  await connection();
  return upgradeWebSocket((ws) => {
    const joinedRooms = new Set<string>();

    ws.on("message", (data: { toString(): string }) => {
      let message: RelayedMessage;
      try {
        message = JSON.parse(data.toString()) as RelayedMessage;
      } catch {
        return;
      }

      if (typeof message.roomId !== "string" || !message.roomId) return;

      const roomId = message.roomId;
      let room = rooms.get(roomId);
      if (!room) {
        room = new Set<RoomClient>();
        rooms.set(roomId, room);
      }
      room.add(ws);
      joinedRooms.add(roomId);

      const payload = JSON.stringify(message);
      for (const client of room) {
        if (client !== ws && client.readyState === 1) {
          client.send(payload);
        }
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
}
