import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../static',
    emptyOutDir: true,
    sourcemap: true
  },
  server: {
    proxy: {
      '/conversation': 'http://localhost:50505',
      '/history': 'http://localhost:50505',
      '/frontend_settings': 'http://localhost:50505',
      '/.auth': 'http://localhost:50505'
    }
  }
})
