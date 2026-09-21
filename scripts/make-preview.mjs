// Builds dist/preview.html — the whole app in ONE file (JS + CSS inlined).
// Used for the in-app Preview tab, which serves a single HTML file.
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const dist = 'dist'
let html = readFileSync(join(dist, 'index.html'), 'utf8')

// Inline the CSS (handles any attribute order, e.g. crossorigin)
html = html.replace(/<link[^>]*rel="stylesheet"[^>]*>/g, (tag) => {
  const m = tag.match(/href="\.\/(assets\/[^"]+\.css)"/)
  if (!m) return tag
  const css = readFileSync(join(dist, m[1]), 'utf8')
  return `<style>\n${css}\n</style>`
})

// Inline the JS module (handles any attribute order, e.g. crossorigin)
html = html.replace(/<script[^>]*type="module"[^>]*><\/script>/g, (tag) => {
  const m = tag.match(/src="\.\/(assets\/[^"]+\.js)"/)
  if (!m) return tag
  const js = readFileSync(join(dist, m[1]), 'utf8')
  return `<script type="module">\n${js}\n</script>`
})

writeFileSync(join(dist, 'preview.html'), html)
const inlined = !html.includes('./assets/')
console.log(inlined ? '✅ dist/preview.html written (single file, assets inlined)' : '⚠️ some assets were NOT inlined')
