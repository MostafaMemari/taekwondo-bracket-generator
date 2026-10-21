import { writeFileSync } from 'node:fs'
import { generateGroupDraw } from '../src/core/bracket/generateGroupDraw.ts'
import { tournamentRules } from '../src/config/tournamentRules.ts'
import { groupByCategory } from '../src/core/grouping/groupByCategory.ts'

const count = Number(process.argv[2] ?? 16)
const participants = Array.from({ length: count }, (_, i) => ({
  id: `t-${i + 1}`,
  fullName: `ورزشکار شماره ${new Intl.NumberFormat('fa-IR').format(i + 1)}`,
  coachName: `مربی ${new Intl.NumberFormat('fa-IR').format((i % 4) + 1)}`,
  ageCategory: 'سن گروهی آزمون',
  weightCategory: `${new Intl.NumberFormat('fa-IR').format(count)}-`,
  sourceRow: i + 2,
}))
const byId = Object.fromEntries(participants.map((p) => [p.id, p]))
const group = groupByCategory(participants)[0]
const draws = {
  [group.id]: generateGroupDraw(group, byId, tournamentRules),
}
const state = {
  state: {
    page: 'bracket',
    fileName: `test-${count}.xlsx`,
    importedAt: new Date().toISOString(),
    participants,
    issues: [],
    draws,
    selectedGroupId: group.id,
    meta: { title: '', subtitle: '', logoDataUrl: null },
    matchNumberOverrides: {},
  },
  version: 4,
}
const html = `<!doctype html><html><body><script>
localStorage.setItem('kyorugi-draw-board-v1', ${JSON.stringify(JSON.stringify(state))});
location.replace(location.href.replace(/seed-big[^/]*[.]html.*$/, 'index-print.html#/bracket/' + encodeURIComponent(${JSON.stringify(group.id)})));
</script></body></html>`
await writeFileSync('dist/seed-big.html', html)
console.log('seed-big.html written:', count, 'participants, group', group.id)
