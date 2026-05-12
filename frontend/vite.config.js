import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'

const httpsConfig = (() => {
  try {
    return {
      key: fs.readFileSync('/certs/key.pem'),
      cert: fs.readFileSync('/certs/cert.pem'),
    }
  } catch {
    return undefined
  }
})()

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    allowedHosts: 'all',
    https: httpsConfig,
    proxy: {
      '/api': {
        target: 'http://backend:3000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://backend:3000',
        changeOrigin: true,
        ws: true,
      }
    }
  }
})