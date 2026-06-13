import { Room } from "./Room";
import { logger } from "../lib/logger";

class RoomManager {
  private rooms = new Map<string, Room>();
  private pending = new Map<string, Promise<Room>>();

  async getOrCreate(sessionId: string): Promise<Room> {
    const existing = this.rooms.get(sessionId);
    if (existing) return existing;

    // Dedupe concurrent creates (duplicate joins / simultaneous signaling)
    // so two callers can't each spin up a separate Router for one session.
    const inFlight = this.pending.get(sessionId);
    if (inFlight) return inFlight;

    const promise = Room.create(sessionId)
      .then((room) => {
        this.rooms.set(sessionId, room);
        this.pending.delete(sessionId);
        return room;
      })
      .catch((err) => {
        this.pending.delete(sessionId);
        throw err;
      });

    this.pending.set(sessionId, promise);
    return promise;
  }

  get(sessionId: string): Room | undefined {
    return this.rooms.get(sessionId);
  }

  close(sessionId: string): void {
    const room = this.rooms.get(sessionId);
    if (room) {
      room.close();
      this.rooms.delete(sessionId);
      logger.info(`RoomManager: closed room ${sessionId}`);
    }
  }

  closeAll(): void {
    for (const [id, room] of this.rooms) {
      room.close();
      this.rooms.delete(id);
    }
  }

  get activeRoomCount(): number {
    return this.rooms.size;
  }

  get totalPeerCount(): number {
    let count = 0;
    for (const room of this.rooms.values()) {
      count += room.peerCount;
    }
    return count;
  }
}

export const roomManager = new RoomManager();
