import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    global: 'window',
  },
  resolve: {
    alias: {
      'node-fetch': 'isomorphic-fetch',
      "https-proxy-agent": "fake-https-proxy-agent",
    },
  },
})
