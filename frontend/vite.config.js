import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    /*
    allowedHosts: [
      "blackjack.com",
      "www.blackjack.com",
      "localhost",
      "127.0.0.1",
    ],
    hmr: {
      clientPort: 443,
      protocol: "wss",
      host: "blackjack.com",
    },
    */ 
   /*THIS LINES NEED TO BE COMMNETED IN ORDER TO WORK -MSORIANO*/
    watch: {
      usePolling: true,
    },
  },
});
