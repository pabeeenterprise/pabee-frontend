import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,          // Exposes the server to the tunnel
    allowedHosts: true   // Allows Localtunnel's URL to connect
  }
})