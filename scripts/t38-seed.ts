import { readFile, writeFile } from 'node:fs/promises'
import { generateGroupDraw } from '../src/core/bracket/generateGroupDraw.ts'
import { parseRosterWorkbook } from '../src/core/excel/parseRosterWorkbook.ts'
import { groupByCategory } from '../src/core/grouping/groupByCategory.ts'
import { tournamentRules } from '../src/config/tournamentRules.ts'

/* ت۳۸ — بذر مرورگر: فقط فهرست نمونه (۲۴ نفر) روی صفحه گروه ها — ت۳۸ مستقیم
   کارت وزن «کودکان ۲۸-» را کلیک می کند و باید از گروه ها شروع شود */

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
  version: 20,
}

const html = `<!doctype html><html><head><meta charset="utf-8"></head><body><script>
localStorage.setItem('kyorugi-draw-board-v1', ${JSON.stringify(JSON.stringify(state))});
location.replace('/' + location.hash);
</script></body></html>`

await writeFile('dist/seed.html', html)
console.log('t38 seed written:', roster.participants.length, 'participants (groups page)')
