interface Env {
  REALTIME_ROOM: DurableObjectNamespace;
  BROADCAST_SECRET: string;
}

export class RealtimeRoom implements DurableObject {
  private state: DurableObjectState;
  private env: Env;

  // env must be captured in constructor — Cloudflare does not inject it via `this`
  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/broadcast") {
      const authHeader = request.headers.get("Authorization");
      if (
        !this.env.BROADCAST_SECRET ||
        authHeader !== `Bearer ${this.env.BROADCAST_SECRET}`
      ) {
        return new Response("Forbidden", { status: 403 });
      }
      let msg: string;
      try {
        msg = await request.text();
        // Validate it is JSON before forwarding — prevents arbitrary string injection
        JSON.parse(msg);
      } catch {
        return new Response("Invalid payload", { status: 400 });
      }
      const sessions = this.state.getWebSockets();
      console.log(`[Realtime] Broadcasting message to ${sessions.length} sessions: ${msg.slice(0, 50)}...`);
      sessions.forEach(ws => ws.send(msg));
      return new Response("Broadcast Sent", { status: 200 });
    }

    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected websocket upgrade.", { status: 426 });
    }

    const { 0: client, 1: server } = new WebSocketPair();
    this.state.acceptWebSocket(server);

    return new Response(null, { status: 101, webSocket: client } as any);
  }

  webSocketMessage(_ws: WebSocket, _message: string | ArrayBuffer) {
    // Echo removed — clients should only receive server-originated broadcasts
  }
}

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);

    // Validate secret at the outer fetch handler before routing into the DO
    if (request.method === "POST" && url.pathname === "/broadcast") {
      const authHeader = request.headers.get("Authorization");
      if (!env.BROADCAST_SECRET || authHeader !== `Bearer ${env.BROADCAST_SECRET}`) {
        return new Response("Forbidden", { status: 403 });
      }
    }

    const id = env.REALTIME_ROOM.idFromName("default-room");
    const stub = env.REALTIME_ROOM.get(id);
    return stub.fetch(request);
  },
};
