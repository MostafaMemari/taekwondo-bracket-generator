#!/usr/bin/env node
/**
 * de-zwnj sweep — قانون agents.md را روی همه متن های پروژه اعمال می کند:
 *   ۱) نیم فاصله (U+200C) → فاصله معمولی
 *   ۲) همزه کسره اضافه (U+0654 روی «ه») → حذف
 *   ۳) «ه» (U+06C0) → «ه»
 * فقط فایل های منبع؛ خروجی های بیلد و فایل های باینری دست نمی خورند.
 */
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs'
import { join, extname } from 'node:path'

const EXT_OK = new Set(['.ts', '.tsx', '.css', '.html', '.mjs'])
const SKIP_DIRS = new Set(['node_modules', 'dist', 'dist-single', '.git', 'public'])
const SKIP_FILES = new Set(['agents.md', 'seed-single.html'])

let changed = 0
let files = 0

function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP_FILES.has(name) && dir === '.') continue
    const full = join(dir, name)
    const st = statSync(full)
    if (st.isDirectory()) {
      if (SKIP_DIRS.has(name)) continue
      walk(full)
      continue
    }
    if (!EXT_OK.has(extname(name))) continue
    const before = readFileSync(full, 'utf8')
    const after = before
      .replace(/\u200c/g, ' ')
      .replace(/\u0654/g, '')
      .replace(/\u06c0/g, 'ه')
    files += 1
    if (after !== before) {
      writeFileSync(full, after, 'utf8')
      changed += 1
      console.log('changed:', full)
    }
  }
}

walk('.')
console.log(`\nswept ${files} files, ${changed} changed`)
