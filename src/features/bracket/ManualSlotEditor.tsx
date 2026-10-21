import { useEffect, useRef, useState, type FocusEvent } from 'react'
import type { Participant } from '../../core/types.ts'
import type { SlotSide } from '../../core/bracket/layout.ts'
import { sideTheme } from './sideColors.ts'

interface ManualSlotEditorProps {
  participant: Participant
  side: SlotSide
  onSave: (patch: { fullName: string; coachName: string }) => void
  onCancel: () => void
}

/**
 * ویرایشگر درون خانه جدول دستی: دو ورودی کوچک روی خود کارت — نام هنرجو و
 * مربی. Enter در نام به مربی می رود، Enter در مربی ثبت می کند، Escape بی خیال،
 * خروج از ورودی ها هم ثبت است. همه چیز روی خود خانه می نشیند تا کاربر جای
 * خانه را گم نکند (رنگ حلقه = رنگ ضلع همان گوشه آبی/قرمز).
 */
export function ManualSlotEditor({ participant, side, onSave, onCancel }: ManualSlotEditorProps) {
  const theme = sideTheme[side]
  const [fullName, setFullName] = useState(participant.fullName)
  const [coachName, setCoachName] = useState(participant.coachName)
  const nameRef = useRef<HTMLInputElement | null>(null)
  const coachRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const input = nameRef.current
    if (!input) return
    input.focus()
    input.select()
  }, [])

  function commit() {
    onSave({ fullName: fullName.trim(), coachName: coachName.trim() })
  }

  /**
   * ثبت فقط وقتی است که فوکوس کامل از ویرایشگر بیرون برود — پرش از نام به
   * مربی (Enter) فوکوس را داخل ظرف نگه می دارد و ویرایشگر باز می ماند.
   */
  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return
    commit()
  }

  const inputStyle = {
    borderColor: theme.borderSoft,
    caretColor: theme.accent,
  }

  return (
    <div
      dir="rtl"
      className="flex h-full w-full flex-col justify-center gap-1 rounded-md bg-white px-1.5"
      style={{ boxShadow: `0 0 0 2px ${theme.accent}` }}
      onBlur={handleBlur}
      onClick={(event) => event.stopPropagation()}
    >
      <input
        ref={nameRef}
        value={fullName}
        onChange={(event) => setFullName(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            coachRef.current?.focus()
          } else if (event.key === 'Escape') {
            event.preventDefault()
            onCancel()
          }
        }}
        placeholder="نام هنرجو"
        maxLength={60}
        aria-label="نام هنرجو"
        autoComplete="off"
        spellCheck={false}
        className="w-full rounded border-0 border-b bg-transparent px-0.5 py-0.5 text-right text-[12.5px] font-bold text-ink-900 outline-none placeholder:font-normal placeholder:text-slate-400"
        style={inputStyle}
      />
      <input
        ref={coachRef}
        value={coachName}
        onChange={(event) => setCoachName(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            commit()
          } else if (event.key === 'Escape') {
            event.preventDefault()
            onCancel()
          }
        }}
        placeholder="مربی (اختیاری)"
        maxLength={60}
        aria-label="مربی"
        autoComplete="off"
        spellCheck={false}
        className="w-full rounded border-0 border-b bg-transparent px-0.5 py-0.5 text-right text-[11.5px] font-medium text-ink-700 outline-none placeholder:font-normal placeholder:text-slate-400"
        style={inputStyle}
      />
    </div>
  )
}
