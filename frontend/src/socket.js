import { io } from "socket.io-client";

const SOCKET_URL = "";

let socketInstance = null;

export const getSocket = () => {
  if (!socketInstance) {
    socketInstance = io(SOCKET_URL, {
      withCredentials: true,
      transports: ["websocket", "polling"],
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    socketInstance.on("connect", () => {
      console.log("✅ Connected to server:", socketInstance.id);
    });

    socketInstance.on("disconnect", (reason) => {
      console.log("❌ Disconnected from server:", reason);
    });

    socketInstance.on("connect_error", (error) => {
      console.error("⚠️ Connection error:", error.message);
    });
  }
  return socketInstance;
};

export const disconnectSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
    console.log("🔌 Socket manually disconnected on logout");
  }
};

// Para mantener compatibilidad con código existente que usa `socket` directamente
export const socket = getSocket();

export default socket;