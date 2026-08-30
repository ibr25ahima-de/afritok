export type StageRequestState = "pending" | "accepted" | "rejected" | "cancelled";

export interface StageRequest {
  requestId: string;
  sessionId: string;
  userId: number;
  username: string;
  state: StageRequestState;
  createdAt: Date;
  updatedAt: Date;
}

export class LiveStageRequestManager {
  private requests = new Map<string, StageRequest>();

  request(sessionId: string, userId: number, username: string): StageRequest {
    const existing = Array.from(this.requests.values()).find((r) => r.sessionId === sessionId && r.userId === userId && r.state === "pending");
    if (existing) return existing;
    const now = new Date();
    const item: StageRequest = { requestId: `stage_req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`, sessionId, userId, username, state: "pending", createdAt: now, updatedAt: now };
    this.requests.set(item.requestId, item);
    return item;
  }

  listPending(sessionId: string): StageRequest[] {
    return Array.from(this.requests.values()).filter((r) => r.sessionId === sessionId && r.state === "pending");
  }

  get(requestId: string): StageRequest | undefined { return this.requests.get(requestId); }

  setState(requestId: string, state: Exclude<StageRequestState, "pending">): StageRequest | undefined {
    const item = this.requests.get(requestId);
    if (!item || item.state !== "pending") return undefined;
    item.state = state;
    item.updatedAt = new Date();
    return item;
  }

  cancelUserRequests(sessionId: string, userId: number): void {
    for (const item of this.requests.values()) if (item.sessionId === sessionId && item.userId === userId && item.state === "pending") { item.state = "cancelled"; item.updatedAt = new Date(); }
  }
}

let instance: LiveStageRequestManager | null = null;
export function getLiveStageRequestManager(): LiveStageRequestManager { return instance ??= new LiveStageRequestManager(); }
