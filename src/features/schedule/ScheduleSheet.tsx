import type { BuiltSchedule, ScheduledMat, ScheduledWeight } from '../../core/schedule/schedule.ts'
import {
  scheduleSideLabel,
  seqRangeLabel,
  sessionLabel,
  winnerLabelPending,
} from '../../core/schedule/schedule.ts'
import { type TournamentMeta } from '../../store/tournamentStore.ts'
import { renderWeightTitle, toFaDigits } from '../../lib/formatFa.ts'
import { roundLabel } from '../../lib/roundLabels.ts'
import { beltColorFor } from '../../lib/beltColor.ts'
import { StatCell } from '../../components/StatCell.tsx'
import { sideTheme, FINAL_GOLD } from '../bracket/sideColors.ts'

/** A4 portrait at 96 dpi — the sheet flows vertically, one column */
export const scheduleSheetWidth = 794

const SHEET_PAD_X = 26
const INK = '#101d31'
const NAVY = '#1e3a5f'
const MUTED = '#5b6b82'

interface ScheduleSheetProps {
  schedule: BuiltSchedule
  meta: TournamentMeta
  /** وزن هایی که در هیچ زمینی قرار نگرفته اند — «کودکان — وزن ۲۸- (۴ مسابقه)» */
  unassignedLabels: string[]
  /** شماره های دستی کاربر — کلید «groupId/matchId»؛ بر شماره برنامه مقدم است */
  manualNumbers?: Map<string, string>
}

/**
 * برگه «برنامه مسابقات»: برای هر بازه زمانی، مسابقه های هر زمین زیر هم —
 * وزن ها از بیشترین تعداد مسابقه به کمترین — با شماره گذاری دوربه دور
 * (فینال ها آخر). منبع چاپ A4 عمودی، خروجی PDF تکه تکه شده و خروجی عکس بلند
 * تلگرام است.
 */
export function ScheduleSheet({ schedule, meta, unassignedLabels, manualNumbers }: ScheduleSheetProps) {
  const weightsCount = schedule.sessions.reduce(
    (sum, scheduled) => sum + scheduled.mats.reduce((sum2, mat) => sum2 + mat.weights.length, 0),
    0,
  )
  const title = meta.title || 'قرعه کشی مسابقات تکواندو'

  return (
    <div
      id="schedule-sheet"
      dir="rtl"
      style={{
        width: scheduleSheetWidth,
        backgroundColor: '#ffffff',
        color: INK,
        padding: `24px ${SHEET_PAD_X}px 30px`,
        fontFamily: 'Vazirmatn, sans-serif',
      }}
    >
      <header
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
          gap: 14,
          paddingBottom: 12,
          borderBottom: '2.5px solid #101d31',
        }}
      >
        <div style={{ justifySelf: 'start', minWidth: 0 }}>
          {meta.logoDataUrl && (
            <img src={meta.logoDataUrl} alt="" style={{ width: 58, height: 58, objectFit: 'contain' }} />
          )}
        </div>
        <div style={{ minWidth: 0, maxWidth: 460, textAlign: 'center' }}>
          <h1
            style={{
              fontFamily: 'Lalezar, Vazirmatn, sans-serif',
              fontSize: meta.title ? 26 : 22,
              lineHeight: 1.3,
              margin: 0,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {title}
          </h1>
          <p style={{ fontSize: 11.5, color: MUTED, margin: '3px 0 0' }}>
            {meta.subtitle && <span>{meta.subtitle} — </span>}
            برنامه زمان بندی و شماره گذاری مسابقه ها
          </p>
        </div>
        <div style={{ justifySelf: 'end', flexShrink: 0 }}>
          <div style={{ display: 'flex', border: '1.5px solid #b9c5d6', borderRadius: 10, overflow: 'hidden' }}>
            <StatCell label="بازه" value={toFaDigits(schedule.sessions.length)} />
            <StatCell label="وزن" value={toFaDigits(weightsCount)} divider />
            <StatCell label="مسابقه" value={toFaDigits(schedule.totalMatches)} divider />
          </div>
        </div>
      </header>

      {schedule.sessions.length === 0 ? (
        <p style={{ padding: '40px 0', textAlign: 'center', fontSize: 13, color: MUTED }}>
          هنوز بازه زمانی ساخته نشده است.
        </p>
      ) : (
        schedule.sessions.map((scheduled) => (
          <section key={scheduled.session.id} style={{ marginTop: scheduled === schedule.sessions[0] ? 16 : 22 }}>
            <div
              dir="rtl"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                backgroundColor: NAVY,
                color: '#ffffff',
                borderRadius: 8,
                padding: '6px 14px',
              }}
            >
              <span style={{ fontSize: 13.5, fontWeight: 700 }}>
                {sessionLabel(scheduled.session, schedule.sessions.indexOf(scheduled))}
              </span>
              <span style={{ fontSize: 10.5, color: '#c7d4e6' }}>
                {scheduled.matchCount > 0 && `${toFaDigits(scheduled.matchCount)} مسابقه`}
              </span>
            </div>
            {scheduled.mats.map((mat) => (
              <MatBlock key={mat.mat.id} mat={mat} schedule={schedule} manualNumbers={manualNumbers} titleFormat={meta.sheetTitleFormat} tournamentTitle={meta.title} />
            ))}
          </section>
        ))
      )}

      {unassignedLabels.length > 0 && (
        <p
          style={{
            marginTop: 24,
            fontSize: 11,
            lineHeight: 1.9,
            color: '#27405f',
            backgroundColor: '#fdf7e7',
            border: '1px solid #e3cf9a',
            borderRadius: 8,
            padding: '8px 14px',
          }}
        >
          خارج از برنامه (به هیچ زمینی اختصاص نیافته): {unassignedLabels.join(' • ')}
        </p>
      )}
    </div>
  )
}

function MatBlock({
  mat,
  schedule,
  manualNumbers,
  titleFormat,
  tournamentTitle,
}: {
  mat: ScheduledMat
  schedule: BuiltSchedule
  manualNumbers?: Map<string, string>
  /** قالب عنوان وزن ها از تنظیمات سراسری */
  titleFormat: string
  tournamentTitle: string
}) {
  return (
    <div className="schedule-avoid-break" style={{ marginTop: 12, breakInside: 'avoid' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 10,
          borderBottom: `2px solid ${NAVY}`,
          paddingBottom: 4,
        }}
      >
        <span style={{ fontSize: 14.5, fontWeight: 700, color: NAVY }}>{mat.mat.label}</span>
        <span style={{ fontSize: 10.5, color: MUTED }}>
          {seqRangeLabel(mat.firstSeq, mat.lastSeq)}
          {mat.matchCount > 0 && ` • ${toFaDigits(mat.matchCount)} مسابقه`}
        </span>
      </div>

      {mat.weights.length === 0 ? (
        <p style={{ margin: '8px 0', fontSize: 11, color: MUTED }}>
          وزنی به این زمین اختصاص نیافته است.
        </p>
      ) : (
        mat.weights.map((weight) => (
          <WeightBlock
            key={weight.groupId}
            weight={weight}
            schedule={schedule}
            manualNumbers={manualNumbers}
            titleFormat={titleFormat}
            tournamentTitle={tournamentTitle}
          />
        ))
      )}
    </div>
  )
}

function WeightBlock({
  weight,
  schedule,
  manualNumbers,
  titleFormat,
  tournamentTitle,
}: {
  weight: ScheduledWeight
  schedule: BuiltSchedule
  manualNumbers?: Map<string, string>
  /** قالب عنوان وزن ها از تنظیمات سراسری */
  titleFormat: string
  tournamentTitle: string
}) {
  const belt = beltColorFor(weight.groupId)
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 0 4px' }}>
        <span
          aria-hidden
          style={{
            width: 10,
            height: 10,
            borderRadius: 3,
            backgroundColor: belt.hex,
            border: belt.needsBorder ? '1px solid #b9c5d6' : undefined,
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: 12.5, fontWeight: 700 }}>
          {renderWeightTitle(titleFormat, {
            ageCategory: weight.ageCategory,
            weightCategory: weight.weightCategory,
            tournamentTitle,
          })}
        </span>
        <span style={{ fontSize: 10, color: MUTED }}>({toFaDigits(weight.matchCount)} مسابقه)</span>
      </div>

      <div
        dir="rtl"
        style={{
          display: 'grid',
          gridTemplateColumns: '46px 118px 1fr 1fr',
          fontSize: 10,
          color: MUTED,
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: 2,
        }}
      >
        <span>شماره</span>
        <span>دور</span>
        <span>ورزشکار آبی</span>
        <span>ورزشکار قرمز</span>
      </div>

      {weight.matches.map((match) => {
        const isFinal = !match.bronze && match.round === weight.roundCount
        const manual = manualNumbers?.get(`${weight.groupId}/${match.matchId}`)
        return (
          <div
            key={match.matchId}
            dir="rtl"
            style={{
              display: 'grid',
              gridTemplateColumns: '46px 118px 1fr 1fr',
              alignItems: 'center',
              minHeight: 27,
              borderBottom: '1px solid #eef2f7',
            }}
          >
            <span style={{ display: 'flex' }}>
              <span
                style={{
                  width: 21,
                  height: 21,
                  borderRadius: 999,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: '#ffffff',
                  background: isFinal ? 'linear-gradient(135deg, #fbbf24, #d97706)' : NAVY,
                  boxShadow: manual ? '0 0 0 2px #f59e0b' : undefined,
                }}
              >
                {manual ? toFaDigits(manual) : toFaDigits(match.seq)}
              </span>
            </span>
            <span style={{ fontSize: 10.5, color: MUTED }}>
              {match.bronze ? 'رده بندی' : roundLabel(match.round, weight.roundCount)}
              {isFinal && <span style={{ color: FINAL_GOLD, fontWeight: 700 }}> ★</span>}
            </span>
            <NameCell
              label={scheduleSideLabel(match.chong, weight.groupId, schedule.seqByKey, manualNumbers)}
              accent={sideTheme.chong.accent}
            />
            <NameCell
              label={scheduleSideLabel(match.hong, weight.groupId, schedule.seqByKey, manualNumbers)}
              accent={sideTheme.hong.accent}
            />
          </div>
        )
      })}
    </div>
  )
}

function NameCell({ label, accent }: { label: string; accent: string }) {
  const pending = winnerLabelPending(label)
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, paddingInlineEnd: 10 }}>
      <span
        aria-hidden
        style={{ width: 7, height: 7, borderRadius: 2, backgroundColor: accent, flexShrink: 0 }}
      />
      <span
        style={{
          fontSize: pending ? 10.5 : 11.5,
          fontWeight: pending ? 500 : 600,
          color: pending ? '#46608a' : INK,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {label}
      </span>
    </span>
  )
}

