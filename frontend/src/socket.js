import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_WS_URL || "wss://blackjack.com";

console.log("Connecting to Socket.IO at:", SOCKET_URL);

export const socket = io(SOCKET_URL, {
  path: "/socket.io/",
  transports: ["websocket", "polling"],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5,
});

socket.on("connect", () => {
  console.log("✅ Connected to server:", socket.id);
});

socket.on("disconnect", (reason) => {
  console.log("❌ Disconnected from server:", reason);
});

socket.on("connect_error", (error) => {
  console.error("⚠️ Connection error:", error.message);
});

export default socket;
