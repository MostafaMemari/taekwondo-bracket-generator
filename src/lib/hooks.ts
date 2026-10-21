import { useMemo } from 'react'
import { buildSchedule } from '../core/schedule/schedule.ts'
import type { BuiltSchedule } from '../core/schedule/schedule.ts'
import type { Participant } from '../core/types.ts'
import { toFaDigits } from './formatFa.ts'
import { useTournament } from '../store/tournamentStore.ts'

/** نقشه شناسه → شرکت کننده — مشترک همه صفحه ها و خروجی ها */
export function useParticipantsById(): Map<string, Participant> {
  const participants = useTournament((state) => state.participants)
  return useMemo(
    () => new Map(participants.map((participant) => [participant.id, participant])),
    [participants],
  )
}

export interface ScheduleModel {
  participantsById: Map<string, Participant>
  /** برنامه کامل ساخته شده — پایه نمای «برنامه» و برچسب «برنده مسابقه N» */
  built: BuiltSchedule
  /** شماره نمایشی هر مسابقه: برنامه + شماره های دستی (دستی مقدم است) — رقم فارسی */
  matchNumbers: Map<string, string>
  /** فقط شماره های دستی کاربر — رقم فارسی، کلید «groupId/matchId» */
  manualNumbers: Map<string, string>
  /** فقط شماره برنامه بدون دستی ها — برای راهنمای دایره های قابل ویرایش */
  planNumbers: Map<string, string>
}

/**
 * مدل زنده برنامه زمین ها برای همه مصرف کننده ها: صفحه برنامه ریزی، صفحه
 * چاپ، پیش نمایش چاپ و رانه های خروجی. یک بار `buildSchedule` می سازد و از
 * همان، هر سه نقشه شماره را بیرون می کشد — قبلا هر صفحه دوبار می ساخت.
 */
export function useScheduleModel(): ScheduleModel {
  const scheduleSessions = useTournament((state) => state.scheduleSessions)
  const draws = useTournament((state) => state.draws)
  const matchNumberOverrides = useTournament((state) => state.matchNumberOverrides)
  const participantsById = useParticipantsById()

  const built = useMemo(
    () => buildSchedule(scheduleSessions, draws, participantsById),
    [scheduleSessions, draws, participantsById],
  )

  const manualNumbers = useMemo(() => {
    const map = new Map<string, string>()
    for (const [groupId, perMatch] of Object.entries(matchNumberOverrides)) {
      for (const [matchId, text] of Object.entries(perMatch)) {
        const trimmed = text.trim()
        if (trimmed) map.set(`${groupId}/${matchId}`, toFaDigits(trimmed))
      }
    }
    return map
  }, [matchNumberOverrides])

  const planNumbers = useMemo(() => {
    const map = new Map<string, string>()
    for (const entry of built.numberEntries) {
      map.set(`${entry.groupId}/${entry.matchId}`, toFaDigits(entry.seq))
    }
    return map
  }, [built])

  const matchNumbers = useMemo(() => {
    const map = new Map(planNumbers)
    for (const [key, text] of manualNumbers) map.set(key, text)
    return map
  }, [planNumbers, manualNumbers])

  return { participantsById, built, matchNumbers, manualNumbers, planNumbers }
}
