import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Vite is the "builder" tool. The React plugin enables JSX; the singlefile
// plugin packs the whole built app into ONE dist/index.html file, which
// makes the app easy to open anywhere (double-click, preview panel, host).
export default defineConfig({
  // base './' lets the built app run from any folder (also powers the preview)
  base: './',
  plugins: [react(), viteSingleFile()],
  server: {
    host: true
  }
})
