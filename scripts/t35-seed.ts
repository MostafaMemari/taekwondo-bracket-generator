import { readFile, writeFile } from 'node:fs/promises'
import { generateGroupDraw } from '../src/core/bracket/generateGroupDraw.ts'
import { parseRosterWorkbook } from '../src/core/excel/parseRosterWorkbook.ts'
import { groupByCategory } from '../src/core/grouping/groupByCategory.ts'
import { tournamentRules } from '../src/config/tournamentRules.ts'
import type { Participant } from '../src/core/types.ts'

/* ت۳۵ — بذر مرورگر: فهرست نمونه + یک گروه ۱۱ نفره آزمونی (۵ استراحت —
   الگوی عکس کاربر)؛ طرح برگه و نوع قرعه روی پیش فرض می مانند تا verify
   اول آینه ای را ببیند و بعد به «همیشه زیر اسم» برود */

const buffer = await readFile('public/sample-registration.xlsx')
const roster = await parseRosterWorkbook(buffer)

const eleven: Participant[] = [
  ['k1', 'کوروش احدی', 'احدی'],
  ['k2', 'سعید احدی', 'احدی'],
  ['k3', 'آرمان احدی', 'احدی'],
  ['k4', 'سلاقی احدی', 'احدی'],
  ['k5', 'امیر احدی', 'احدی'],
  ['k6', 'بهداد احدی', 'احدی'],
  ['k7', 'بهزاد احدی', 'احدی'],
  ['k8', 'پویان احدی', 'احدی'],
  ['k9', 'آرین احدی', 'احدی'],
  ['k10', 'ایمان احدی', 'احدی'],
  ['k11', 'رادین احدی', 'احدی'],
].map(([id, fullName, coachName], index) => ({
  id,
  fullName,
  coachName,
  ageCategory: 'آزمون ۱۱ نفره',
  weightCategory: '۶۰-',
  weightKg: '',
  sourceRow: 900 + index,
}))

const all = [...roster.participants, ...eleven]
const participantsRecord = Object.fromEntries(all.map((p) => [p.id, p]))

const draws: Record<string, GroupDraw> = {}
for (const group of groupByCategory(all)) {
  draws[group.id] = generateGroupDraw(group, participantsRecord, tournamentRules)
}

const groups = Object.values(draws)
const elevenGroup = groups.find((g) => g.group.participantIds.includes('k1'))
if (!elevenGroup) throw new Error('eleven group was not generated')

const state = {
  state: {
    page: 'schedule',
    fileName: 'sample-registration.xlsx',
    importedAt: new Date().toISOString(),
    participants: all,
    issues: roster.issues,
    draws,
    selectedGroupId: null,
    meta: {
      title: 'مسابقات قهرمانی آزمون',
      subtitle: '',
      logoDataUrl: null,
      sheetTitleFormat: '{رده سنی} — وزن {وزن}',
    },
    matchNumberOverrides: {},
    scheduleSessions: [],
    manualTables: {},
    medalRainTables: {},
    tableBeltLabels: {},
    sessionBeltLabels: {},
    tableThemeId: 'classic',
    matchChipStyle: { shape: 'circle', fill: 'solid', color: null },
    matchChipSize: 'normal',
    showChampion: true,
    sheetLayout: 'classic',
    drawTypeId: 'coachSeeded',
    byePlacementId: 'mirror',
  },
  version: 18,
}

const html = `<!doctype html><html><head><meta charset="utf-8"></head><body><script>
localStorage.setItem('kyorugi-draw-board-v1', ${JSON.stringify(JSON.stringify(state))});
location.replace('/' + location.hash);
</script></body></html>`

await writeFile('dist/seed.html', html)
console.log('t35 seed written:', all.length, 'participants; eleven group =', elevenGroup.group.id)
