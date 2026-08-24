import { ChevronLeft } from 'lucide-react'
import type { GroupDraw } from '../../core/types.ts'
import { beltColorFor } from '../../lib/beltColor.ts'
import { toFaDigits } from '../../lib/formatFa.ts'

interface GroupCardProps {
  draw: GroupDraw
  onOpen: () => void
}

export function GroupCard({ draw, onOpen }: GroupCardProps) {
  const participantCount = Object.keys(draw.assignments).length
  const byeCount = draw.structure.byeSlotIds.length
  const matchCount = participantCount - 1
  const belt = beltColorFor(draw.groupId)

  return (
    <button
      onClick={onOpen}
      className="group relative overflow-hidden rounded-xl border border-line bg-surface p-5 text-right transition-all duration-150 hover:-translate-y-0.5 hover:border-mat-600 hover:shadow-md"
    >
      <span
        aria-hidden
        className="absolute inset-y-0 start-0 w-1.5"
        style={{ backgroundColor: belt.hex, boxShadow: belt.needsBorder ? 'inset -1px 0 0 #d8dfea' : undefined }}
      />
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-xl text-ink-900">{draw.group.ageCategory}</h3>
          <p className="mt-1 inline-block rounded-md bg-turf px-2 py-0.5 text-xs font-medium text-ink-700">
            وزن {draw.group.weightCategory}
          </p>
        </div>
        <ChevronLeft size={18} className="mt-1 text-line-strong transition-colors group-hover:text-mat-600" />
      </div>
      <p className="mt-4 text-sm font-bold text-ink-900">
        {toFaDigits(participantCount)} شرکت‌کننده
      </p>
      <p className="mt-1 text-xs text-muted">
        {toFaDigits(matchCount)} مسابقه
        {byeCount > 0 && <> • {toFaDigits(byeCount)} استراحت (بای)</>}
      </p>
    </button>
  )
}
