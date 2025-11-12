import { WebSocketServer } from "ws";
import http from "http";

const server = http.createServer();
const wss = new WebSocketServer({ server, path: "/stream" });

const rooms = new Map();

function getRoom(id) {
  if (!rooms.has(id)) {
    rooms.set(id, { sender: null, receivers: new Set() });
  }
  return rooms.get(id);
}

wss.on("connection", (ws, req) => {
  const url = new URL(req.url, "http://dummy/");
  const room = url.searchParams.get("room") || "default";
  const role = url.searchParams.get("role") || "receiver";
  const r = getRoom(room);

  if (role === "sender") {
    r.sender = ws;
    console.log(`Sender connected → Room: ${room}`);
  } else {
    r.receivers.add(ws);
    console.log(`Receiver connected → Room: ${room}`);
  }

  ws.on("message", (data, isBinary) => {
    if (role === "sender") {
      for (const client of r.receivers) {
        if (client.readyState === 1) client.send(data, { binary: isBinary });
      }
    }
  });

  ws.on("close", () => {
    if (role === "sender") r.sender = null;
    else r.receivers.delete(ws);
  });
});

server.listen(process.env.PORT || 3001, () =>
  console.log("✅ Render relay running on port", process.env.PORT || 3001)
);