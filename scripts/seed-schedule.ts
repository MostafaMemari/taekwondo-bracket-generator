import { readFile, writeFile } from 'node:fs/promises'
import { generateGroupDraw } from '../src/core/bracket/generateGroupDraw.ts'
import { parseRosterWorkbook } from '../src/core/excel/parseRosterWorkbook.ts'
import { groupByCategory } from '../src/core/grouping/groupByCategory.ts'
import { tournamentRules } from '../src/config/tournamentRules.ts'
import type { GroupDraw } from '../src/core/types.ts'

/**
 * Seed برای تست مرورگری «برنامه ریزی زمین ها» با سناریوی واقعی کاربر:
 *   بازه ۸:۰۰–۱۰:۰۰ → زمین ۱: کودکان ۲۸- + کودکان ۳۵+ + نوجوانان ۴۵-
 *                      زمین ۲: جوانان ۵۵-
 *   نوجوانان ۵۳+ خارج از برنامه، جوانان ۶۶+ تک نفره
 * یک شماره دستی «۵۰» روی نوجوانان ۴۵-/match-3 برای تست اولویت دستی.
 *
 * خروجی ها:
 *   dist/seed.html            → برای تست روی http (بیلد dist)
 *   scripts/seed-single.html  → تک فایل download/taekwondo-bracket.html + تزریق seed
 */

const buffer = await readFile('public/sample-registration.xlsx')
const roster = await parseRosterWorkbook(buffer)
const participantsRecord = Object.fromEntries(roster.participants.map((p) => [p.id, p]))

const draws: Record<string, GroupDraw> = {}
for (const group of groupByCategory(roster.participants)) {
  draws[group.id] = generateGroupDraw(group, participantsRecord, tournamentRules)
}

const state = {
  state: {
    page: 'groups',
    fileName: 'sample-registration.xlsx',
    importedAt: new Date().toISOString(),
    participants: roster.participants,
    issues: roster.issues,
    draws,
    selectedGroupId: null,
    meta: {
      title: 'مسابقات قهرمانی تکواندو',
      subtitle: 'فصل ۱۴۰۵ — سالن انقلاب',
      logoDataUrl: null,
    },
    matchNumberOverrides: {
      'نوجوانان__۴۵-': { 'match-3': '۵۰' },
    },
    scheduleSessions: [
      {
        id: 'session-1',
        timeFrom: '۸:۰۰',
        timeTo: '۱۰:۰۰',
        mats: [
          { id: 'mat-1', label: 'زمین ۱', groupIds: ['کودکان__۲۸-', 'کودکان__۳۵+', 'نوجوانان__۴۵-'] },
          { id: 'mat-2', label: 'زمین ۲', groupIds: ['جوانان__۵۵-'] },
        ],
      },
    ],
  },
  version: 7,
}

const seedJson = JSON.stringify(JSON.stringify(state))

// 1) http variant — sets localStorage then jumps to the app root
// (charset meta is mandatory — without it the browser decodes the UTF-8
//  Persian seed as windows-1252 and every seeded label turns to mojibake)
const seedHtml = `<!doctype html><html><head><meta charset="utf-8"></head><body><script>
localStorage.setItem('kyorugi-draw-board-v1', ${seedJson});
location.replace('/');
</script></body></html>`
await writeFile('dist/seed.html', seedHtml)
console.log('dist/seed.html written')

// 2) single-file variant — inline script runs BEFORE the app module boots,
//    so the first boot already reads the seeded state (no reload needed)
const single = await readFile('/home/z/my-project/download/taekwondo-bracket.html', 'utf8')
const inject = `<script>try{localStorage.setItem('kyorugi-draw-board-v1', ${seedJson});}catch(e){console.error('seed failed',e)}</script>`
const patched = single.replace('<head>', () => `<head>\n${inject}`)
if (patched === single) throw new Error('<head> not found in single-file html')
await writeFile('scripts/seed-single.html', patched)
console.log(
  'scripts/seed-single.html written (' + (patched.length / 1024 / 1024).toFixed(2) + ' MB)',
)
