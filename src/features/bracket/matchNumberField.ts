import { useCallback, useState } from 'react'
import { toFaDigits } from '../../lib/formatFa.ts'
import { useTournament } from '../../store/tournamentStore.ts'
import { FINAL_GOLD } from './sideColors.ts'

/** بیشترین طول شماره دستی مسابقه — ورودی و store هر دو همین سقف را می پذیرند */
export const MATCH_NUMBER_MAX = 4

/** رنگ سرمه بدنه و طلایی فینال + هاله فوکوس هر کدام — برای هر سه چipt شماره */
export function matchChipTone(isFinal: boolean): { accent: string; halo: string } {
  return {
    accent: isFinal ? FINAL_GOLD : '#1e3a5f',
    halo: isFinal ? 'rgba(217, 119, 6, 0.4)' : 'rgba(33, 88, 215, 0.35)',
  }
}

/**
 * راهنمای دایره شماره — برای چipt های قابل ویرایش: شماره دستی را نام می برد
 * و شماره برنامه را برای مقایسه کنارش می گذارد.
 */
export function matchNumberTooltip(options: {
  override: string
  planText?: string
}): string {
  const { override, planText } = options
  if (override) {
    const planSuffix = planText && planText !== override ? ` — برنامه: ${planText}` : ''
    return `شماره دستی «${toFaDigits(override)}»${planSuffix}`
  }
  if (planText) return 'شماره از برنامه زمین ها — برای تغییر دستی کلیک کنید'
  return 'شماره مسابقه را همین جا بنویسید — خودکار ذخیره می شود'
}

interface MatchNumberField {
  override: string
  /** true وقتی ورودی فوکوس دارد — حین تایپ همان نوشته کاربر دیده می شود */
  focused: boolean
  setFocused: (focused: boolean) => void
  /** ذخیره شماره دستی — store خودش به رقم انگلیسی استاندارد می کند */
  setValue: (value: string) => void
  /** پاک کردن شماره دستی و بازگشت به شماره برنامه */
  clear: () => void
  /** Enter ثبت می کند (blur) و Escape پاک می کند — رفتار مشترک ورودی های شماره */
  onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void
}

/**
 * نیمه مشترک هر سه چipt شماره مسابقه: خواندن/نوشتن شماره دستی در store،
 * حالت فوکوس و کلیدهای Enter/Escape. نمایش (رقم فارسی، رنگ، هاله) را
 * `matchChipTone` و `matchNumberTooltip` می سازند تا سه جا یکی بماند.
 */
export function useMatchNumberField(groupId: string, matchId: string): MatchNumberField {
  const override = useTournament((state) => state.matchNumberOverrides[groupId]?.[matchId] ?? '')
  const setMatchNumber = useTournament((state) => state.setMatchNumber)
  const [focused, setFocused] = useState(false)

  const setValue = useCallback(
    (value: string) => setMatchNumber(groupId, matchId, value),
    [groupId, matchId, setMatchNumber],
  )
  const clear = useCallback(
    () => setMatchNumber(groupId, matchId, null),
    [groupId, matchId, setMatchNumber],
  )
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') event.currentTarget.blur()
      if (event.key === 'Escape') {
        setMatchNumber(groupId, matchId, null)
        event.currentTarget.blur()
      }
    },
    [groupId, matchId, setMatchNumber],
  )

  return { override, focused, setFocused, setValue, clear, onKeyDown }
}
