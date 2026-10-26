import { useTournament } from '../store/tournamentStore.ts'

/**
 * باز کردن تخته قرعه از ناوبری داشبورد (نوار بالا و کارت داشبورد):
 * جدول انتخاب شده اگر هنوز موجود است، وگرنه اولین گروه؛ و اگر هیچ گروهی
 * نبود، فهرست گروه ها. جای «قرعه» در منو همان مسیر می رود.
 */
export function openBracketFromNav(): void {
  const state = useTournament.getState()
  const ids = Object.keys(state.draws)
  if (ids.length === 0) {
    state.openGroups()
    return
  }
  const selected = state.selectedGroupId
  state.openBracket(selected && state.draws[selected] ? selected : ids[0])
}
