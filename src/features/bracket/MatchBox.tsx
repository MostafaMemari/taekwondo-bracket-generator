import type { ReactNode } from 'react'
import { Trophy } from 'lucide-react'
import type { LayoutDims, LayoutMatch } from '../../core/bracket/layout.ts'
import { matchLabel, roundLabel } from '../../lib/roundLabels.ts'

interface MatchBoxProps {
  match: LayoutMatch
  roundCount: number
  dims: LayoutDims
  renderSlot: (slotId: string) => ReactNode
}

export function MatchBox({ match, roundCount, dims, renderSlot }: MatchBoxProps) {
  const isFinal = match.round === roundCount

  if (match.topSlotId) {
    return (
      <div
        dir="rtl"
        className={`flex h-full w-full flex-col overflow-hidden rounded-lg border bg-surface ${
          isFinal ? 'border-gold-500' : 'border-line-strong'
        }`}
      >
        <div
          className={`flex items-center justify-center gap-1.5 border-b py-1 text-[11px] font-bold ${
            isFinal ? 'border-gold-500 bg-gold-50 text-gold-600' : 'border-line bg-turf text-muted'
          }`}
          style={{ height: dims.matchHeaderHeight }}
        >
          {isFinal && <Trophy size={12} />}
          {matchLabel(match.matchNumber)}
        </div>
        <div
          className="grid flex-1 grid-rows-2 p-1.5"
          style={{ gap: dims.matchInnerGap }}
        >
          {renderSlot(match.topSlotId)}
          {renderSlot(match.bottomSlotId!)}
        </div>
      </div>
    )
  }

  return (
    <div
      dir="rtl"
      className={`flex h-full w-full flex-col items-center justify-center gap-0.5 rounded-lg border text-center ${
        isFinal ? 'border-gold-500 bg-gold-50' : 'border-line bg-turf'
      }`}
    >
      <span
        className={`flex items-center gap-1.5 text-xs font-bold ${
          isFinal ? 'text-gold-600' : 'text-ink-800'
        }`}
      >
        {isFinal && <Trophy size={13} />}
        {matchLabel(match.matchNumber)}
      </span>
      <span className="text-[10px] text-muted">{roundLabel(match.round, roundCount)}</span>
    </div>
  )
}
