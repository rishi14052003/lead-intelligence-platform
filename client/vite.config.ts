import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Environment variables configuration
  // Variables starting with VITE_ are exposed to the client
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
  },
})
