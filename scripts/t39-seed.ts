import { readFile, writeFile } from 'node:fs/promises'
import { generateGroupDraw } from '../src/core/bracket/generateGroupDraw.ts'
import { parseRosterWorkbook } from '../src/core/excel/parseRosterWorkbook.ts'
import { groupByCategory } from '../src/core/grouping/groupByCategory.ts'
import { tournamentRules } from '../src/config/tournamentRules.ts'
import type { Participant } from '../src/core/types.ts'

/* ت۳۹ — بذر سنجش ارتفاع: یک گروه ۱۶ نفره (بدترین حالت تک برگه — ۸ ردیف باند)
   + زیرعنوان پر + یک گروه ۲۴ نفره (چند صفحه ای) — برای اندازه گیری دقیق فضای
   خالی برگه قبل و بعد از بلندتر کردن خط نوشتن جدول نتایج */

const buffer = await readFile('public/sample-registration.xlsx')
const roster = await parseRosterWorkbook(buffer)

function makeGroup(count: number, category: string, weight: string): Participant[] {
  const families = ['احدی', 'رضایی', 'کریمی', 'موسوی', 'صادقی', 'نادری', 'قاسمی', 'حسینی']
  return Array.from({ length: count }, (_, index) => {
    const family = families[index % families.length]
    return {
      id: `g${count}-${index + 1}`,
      fullName: `ورزشکار ${index + 1} ${family}`,
      coachName: family,
      ageCategory: category,
      weightCategory: weight,
      weightKg: '',
      sourceRow: 9000 + count * 100 + index,
    }
  })
}

const all = [
  ...roster.participants,
  ...makeGroup(16, 'آزمون ۱۶ نفره', '۶۰-'),
  ...makeGroup(24, 'آزمون ۲۴ نفره', '۶۵-'),
]
const participantsRecord = Object.fromEntries(all.map((p) => [p.id, p]))

const draws: Record<string, GroupDraw> = {}
for (const group of groupByCategory(all)) {
  draws[group.id] = generateGroupDraw(group, participantsRecord, tournamentRules)
}

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
      subtitle: 'فدراسیون تکواندو — دوره آزمایشی داوران',
      logoDataUrl: null,
      sheetTitleFormat: '{رده سنی} — وزن {وزن}',
    },
    matchNumberOverrides: {},
    scheduleSessions: [
      {
        id: 'session-1',
        timeFrom: '۸:۰۰',
        timeTo: '۱۰:۰۰',
        mats: [
          { id: 'mat-1', label: 'زمین ۱', groupIds: ['آزمون ۱۶ نفره__۶۰-'] },
          { id: 'mat-2', label: 'زمین ۲', groupIds: ['آزمون ۲۴ نفره__۶۵-'] },
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
  version: 20,
}

const html = `<!doctype html><html><head><meta charset="utf-8"></head><body><script>
localStorage.setItem('kyorugi-draw-board-v1', ${JSON.stringify(JSON.stringify(state))});
location.replace('/' + location.hash);
</script></body></html>`

await writeFile('dist/seed.html', html)
const counts = Object.values(draws).map((d) => ({ id: d.group.id, n: d.group.participantIds.length }))
console.log('t39 seed written:', all.length, 'participants')
console.log(counts.filter((c) => c.id.includes('آزمون')).map((c) => `${c.id}: ${c.n}`).join(' | '))
