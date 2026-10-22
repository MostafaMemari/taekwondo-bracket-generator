import { readFile, writeFile } from 'node:fs/promises'
import { generateGroupDraw } from '../src/core/bracket/generateGroupDraw.ts'
import { parseRosterWorkbook } from '../src/core/excel/parseRosterWorkbook.ts'
import { groupByCategory } from '../src/core/grouping/groupByCategory.ts'
import { tournamentRules } from '../src/config/tournamentRules.ts'
import type { Participant } from '../src/core/types.ts'

/* ت۳۰ — بذر مرورگر: فهرست نمونه + یک گروه دو نفره آزمونی؛ طرح برگه روی
   پیش فرض (کلاسیک) می ماند تا verify اول کلاسیک را ببیند و بعد از تنظیمات
   به مدرن برود */

const buffer = await readFile('public/sample-registration.xlsx')
const roster = await parseRosterWorkbook(buffer)

const duo: Participant[] = [
  {
    id: 'duo-1',
    fullName: 'امیر حیدری',
    coachName: 'حیدری',
    ageCategory: 'آزمون دو نفره',
    weightCategory: '۲۶-',
    weightKg: '',
    sourceRow: 900,
  },
  {
    id: 'duo-2',
    fullName: 'رضا کریمی',
    coachName: 'کریمی',
    ageCategory: 'آزمون دو نفره',
    weightCategory: '۲۶-',
    weightKg: '',
    sourceRow: 901,
  },
]

const all = [...roster.participants, ...duo]
const participantsRecord = Object.fromEntries(all.map((p) => [p.id, p]))

const draws: Record<string, GroupDraw> = {}
for (const group of groupByCategory(all)) {
  draws[group.id] = generateGroupDraw(group, participantsRecord, tournamentRules)
}

const groups = Object.values(draws)
const duoGroup = groups.find((g) => g.group.participantIds.includes('duo-1'))
if (!duoGroup) throw new Error('duo group was not generated')
const g8 = groups.find(
  (g) => g.group.id !== duoGroup.group.id && g.group.participantIds.length >= 4,
)
if (!g8) throw new Error('8+ group was not generated')

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
    scheduleSessions: [
      {
        id: 's1',
        timeFrom: '۸:۰۰',
        timeTo: '۱۰:۰۰',
        mats: [
          {
            id: 'm1',
            label: 'زمین ۱',
            groupIds: [duoGroup.group.id, g8.group.id],
          },
        ],
      },
    ],
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
console.log(
  't30 seed written:',
  all.length,
  'participants; duo group =',
  duoGroup.group.id,
  '; second group =',
  g8.group.id,
)
