import http from "http";
import { WebSocketServer } from "ws";

const PORT = process.env.PORT || 10000;

const server = http.createServer((req, res) => {
  // This route proves to Render that port is open
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("✅ PCM Relay Server Active");
});

const wss = new WebSocketServer({ server, path: "/stream" });

const rooms = new Map();

function getRoom(id) {
  if (!rooms.has(id)) {
    rooms.set(id, { sender: null, receivers: new Set() });
  }
  return rooms.get(id);
}

wss.on("connection", (ws, req) => {
  const url = new URL(req.url, "http://localhost/");
  const room = url.searchParams.get("room") || "default";
  const role = url.searchParams.get("role") || "receiver";
  const r = getRoom(room);

  if (role === "sender") {
    r.sender = ws;
    console.log(`🎤 Sender connected → Room: ${room}`);
  } else {
    r.receivers.add(ws);
    console.log(`🎧 Receiver connected → Room: ${room}`);
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
    console.log(`❌ ${role} left → Room: ${room}`);
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Render relay running at PORT ${PORT}`);
});
