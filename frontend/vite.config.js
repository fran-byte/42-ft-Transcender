import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    
    // Le decimos a Vite que estos dominios son nuestros amigos y les deje pasar
    allowedHosts: [
      "blackjack.local",
      "www.blackjack.local",
      "localhost",
      "127.0.0.1",
    ],
    
    // Y esto lo dejamos abierto para que el recargado automático funcione
    hmr: {
      clientPort: 443,
      protocol: "wss",
      host: "blackjack.local",
    },
    
    watch: {
      usePolling: true,
    },
  },
});
