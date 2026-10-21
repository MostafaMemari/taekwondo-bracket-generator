import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const distDir = path.join(root, 'dist-single')
const outPath = '/home/z/my-project/download/taekwondo-bracket.html'

const html = await readFile(path.join(distDir, 'index.html'), 'utf8')

// collect built assets
const assetDir = path.join(distDir, 'assets')
const { readdir } = await import('node:fs/promises')
const assets = await readdir(assetDir)
const jsFile = assets.find((name) => name.endsWith('.js'))
const cssFile = assets.find((name) => name.endsWith('.css'))
if (!jsFile || !cssFile) throw new Error('built js/css not found in dist-single/assets')

const js = await readFile(path.join(assetDir, jsFile), 'utf8')
const css = await readFile(path.join(assetDir, cssFile), 'utf8')
const favicon = await readFile(path.join(distDir, 'favicon.svg'), 'utf8')
const faviconHref = `data:image/svg+xml;base64,${Buffer.from(favicon, 'utf8').toString('base64')}`

// safety: an inline <script> must not contain a literal closing tag
const inlineJs = js.replaceAll('</script', '<\\/script').replaceAll('<!--', '<\\!--')

let out = html
  // strip preloads (they point at data: URIs or files we inline anyway)
  .replace(/<link\s+rel="preload"[^>]*>\s*/g, '')
  .replace(/<link\s+rel="icon"[^>]*>/, `<link rel="icon" href="${faviconHref}" />`)
  .replace(
    new RegExp(`<link\\s+rel="stylesheet"[^>]*href="[^"]*${cssFile}"[^>]*>\\s*`),
    '',
  )
  .replace(
    new RegExp(`<script\\s+type="module"[^>]*src="[^"]*${jsFile}"[^>]*>\\s*</script>`),
    '',
  )

const styleTag = `<style>\n${css}\n</style>`
const scriptTag = `<script type="module">\n${inlineJs}\n</script>`

// NOTE: replacer *functions* are mandatory — the bundle text contains `$`
// sequences (e.g. `$'`) that String.replace would otherwise expand
out = out.replace('</head>', () => `${styleTag}\n</head>`)
out = out.replace('</body>', () => `${scriptTag}\n</body>`)

await writeFile(outPath, out, 'utf8')
const sizeMb = (Buffer.byteLength(out, 'utf8') / 1024 / 1024).toFixed(2)
console.log(`single-file written: ${outPath} (${sizeMb} MB)`)
if (out.includes(`${jsFile}`) || out.includes(`${cssFile}`)) {
  throw new Error('output still references external asset files')
}
console.log('no external asset references remain')
