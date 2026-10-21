import { readFile, writeFile } from 'node:fs/promises'
import { generateGroupDraw } from '../src/core/bracket/generateGroupDraw.ts'
import { parseRosterWorkbook } from '../src/core/excel/parseRosterWorkbook.ts'
import { groupByCategory } from '../src/core/grouping/groupByCategory.ts'
import { tournamentRules } from '../src/config/tournamentRules.ts'
import type { GroupDraw } from '../src/core/types.ts'

const buffer = await readFile('public/sample-registration.xlsx')
const roster = await parseRosterWorkbook(buffer)
const participantsRecord = Object.fromEntries(roster.participants.map((p) => [p.id, p]))

const draws: Record<string, GroupDraw> = {}
for (const group of groupByCategory(roster.participants)) {
  draws[group.id] = generateGroupDraw(group, participantsRecord, tournamentRules)
}

const groups = Object.values(draws)
const bySize = (size: number) => groups.find((g) => g.group.participantIds.length === size)
const g16 = bySize(16) ?? groups.reduce((a, b) =>
  b.group.participantIds.length > a.group.participantIds.length ? b : a,
)
// گروه دوم متفاوت — برای برنامه زمین ها و آزمون شماره های زنده
const g8 =
  groups.find((g) => g.group.id !== g16.group.id && g.group.participantIds.length >= 4) ?? g16

const state = {
  state: {
    page: 'schedule',
    fileName: 'sample-registration.xlsx',
    importedAt: new Date().toISOString(),
    participants: roster.participants,
    issues: roster.issues,
    draws,
    selectedGroupId: null,
    meta: {
      title: '',
      subtitle: '',
      logoDataUrl: null,
      sheetTitleFormat: '{رده سنی} — وزن {وزن}',
    },
    matchNumberOverrides: {},
    scheduleSessions: [
      {
        id: 's1',
        timeFrom: '۸:۰۰',
        timeTo: '۱۲:۰۰',
        mats: [{ id: 'm1', label: 'زمین ۱', groupIds: [g16.group.id, g8.group.id] }],
      },
    ],
    manualTables: {},
    medalRainTables: {},
    tableBeltLabels: { [g16.group.id]: 'سبز و آبی' },
    tableThemeId: 'classic',
    matchChipStyle: { shape: 'circle', fill: 'solid', color: null },
    matchChipSize: 'normal',
  },
  version: 14,
}

const html = `<!doctype html><html><head><meta charset="utf-8"></head><body><script>
localStorage.setItem('kyorugi-draw-board-v1', ${JSON.stringify(JSON.stringify(state))});
location.replace('/' + location.hash);
</script></body></html>`

await writeFile('dist/seed.html', html)
console.log('t27 seed written:', roster.participants.length, 'participants; 16-group =', g16.group.id)
