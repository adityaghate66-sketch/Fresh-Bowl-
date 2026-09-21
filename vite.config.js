import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite is the "builder" tool. This file just tells it to use the React plugin
// and to make the dev server reachable on the local network as well.
export default defineConfig({
  // base './' lets the built app run from any folder (also powers the preview)
  base: './',
  plugins: [react()],
  server: {
    host: true
  }
})
