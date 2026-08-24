import { readFile, writeFile } from 'node:fs/promises'
import { generateGroupDraw } from '../src/core/bracket/generateGroupDraw.ts'
import { parseRosterWorkbook } from '../src/core/excel/parseRosterWorkbook.ts'
import { groupByCategory } from '../src/core/grouping/groupByCategory.ts'
import { tournamentRules } from '../src/config/tournamentRules.ts'
import type { GroupDraw } from '../src/core/types.ts'

const buffer = await readFile('public/sample-registration.xlsx')
const roster = await parseRosterWorkbook(buffer)
const sizeFilter = process.argv[3] ? Number(process.argv[3]) : null
const filteredParticipants = sizeFilter
  ? roster.participants.filter((p) => {
      const groupKey = `${p.ageCategory}__${p.weightCategory}`
      const count = roster.participants.filter(
        (other) => `${other.ageCategory}__${other.weightCategory}` === groupKey,
      ).length
      return count === sizeFilter
    })
  : roster.participants
const participantsRecord = Object.fromEntries(filteredParticipants.map((p) => [p.id, p]))

const draws: Record<string, GroupDraw> = {}
for (const group of groupByCategory(filteredParticipants)) {
  draws[group.id] = generateGroupDraw(group, participantsRecord, tournamentRules)
}

const targetPage = process.argv[2] === 'bracket' ? 'bracket' : 'groups'
const selectedGroup =
  process.argv[2] === 'bracket'
    ? (groupByCategory(filteredParticipants).find((g) => g.participantIds.length === 5)?.id ?? null)
    : null

const state = {
  state: {
    page: targetPage,
    fileName: 'sample-registration.xlsx',
    importedAt: new Date().toISOString(),
    participants: filteredParticipants,
    issues: sizeFilter ? [] : roster.issues,
    draws,
    selectedGroupId: selectedGroup,
  },
  version: 1,
}

const html = `<!doctype html><html><body><script>
localStorage.setItem('kyorugi-draw-board-v1', ${JSON.stringify(JSON.stringify(state))});
location.replace('/' + location.hash);
</script></body></html>`

await writeFile('dist/seed.html', html)
console.log('dist/seed.html written with', filteredParticipants.length, 'participants')
