import { useMemo } from "react";
import type { GroupDraw, Participant } from "../../core/types.ts";
import {
  buildStagedPrintPlans,
  computeBracketLayout,
  computePlanLayout,
  fitPrintDims,
  type BracketLayout,
  type LayoutDims,
  type PlanLeaf,
  type SlotSide,
} from "../../core/bracket/layout.ts";
import type { TournamentMeta } from "../../store/tournamentStore.ts";
import { beltColorFor } from "../../lib/beltColor.ts";
import { renderWeightTitle, toFaDigits } from "../../lib/formatFa.ts";
import { realMatchCount } from "../../lib/drawStats.ts";
import { findSoloParticipant } from "../../lib/soloDraw.ts";
import { roundLabel } from "../../lib/roundLabels.ts";
import { StatCell } from "../../components/StatCell.tsx";
import { FitText } from "../../components/FitText.tsx";
import { MatchBox } from "../bracket/MatchBox.tsx";
import {
  AthleteRow,
  ByeRow,
  PositionRow,
  WinnerRow,
} from "../bracket/SlotRows.tsx";
import { FINAL_GOLD } from "../bracket/sideColors.ts";
import {
  matchChipTone,
  matchNumberTooltip,
  useMatchNumberField,
} from "../bracket/matchNumberField.ts";

/** A4 landscape at 96 dpi */
export const sheetWidth = 1120;
/** ارتفاع یک صفحه A4 افقی روی برگه — همه صفحه های چاپ با همین قطع رندر می شوند */
export const pageHeight = 770;

const HEADER_HEIGHT = 104;
const SHEET_PAD_X = 30;
/** جدول نتایج دستنویس پای برگه — ارتفاع ثابت و شناخته شده برای صفحه بندی */
const RESULTS_HEIGHT = 126;

interface BracketSheetProps {
  draw: GroupDraw;
  participantsById: Map<string, Participant>;
  meta: TournamentMeta;
  /** order of this sheet in the export batch — used for the DOM id */
  index: number;
  /**
   * «print» = the A4 sheet with the hand-written results table;
   * «image» = PNG export for Telegram — same sheet WITHOUT the results block,
   * so the bracket can use the free space instead.
   */
  variant?: "print" | "image";
  /**
   * شماره نمایشی مسابقه ها — کلید «groupId/matchId». از برنامه زنده زمین ها
   * و شماره های دستی می آید؛ مسابقه ای که شماره نداشته باشد دایره خالی می گیرد
   * تا با دست پر شود.
   */
  matchNumbers?: Map<string, string>;
  /**
   * شماره «برنامه» بدون دستی ها — برای tooltip دایره های قابل ویرایش
   * («شماره دستی ۵ — برنامه: ۴»).
   */
  planNumbers?: Map<string, string>;
  /**
   * حالت تعاملی (پیش نمایش داخل «حالت جدولی»): دایره شماره هر مسابقه یک
   * ورودی واقعی می شود و همان جا شماره دستی می پذیرد. این حالت همیشه «تک
   * برگه» رندر می شود (بدون صفحه بندی) تا ورودی ها دوتایی نشوند.
   */
  editableNumbers?: boolean;
  /**
   * برچسب زمین این برگه — مثلا «زمین ۱» — روی سربرگ درشت و خوانا می نشیند
   */
  matLabel?: string;
  /** ساعت حضور این برگه — فقط یک زمان (ساعت شروع بازه)، مثلا «۸:۰۰» */
  attendTime?: string;
}

export function BracketSheet({
  draw,
  participantsById,
  meta,
  index,
  variant = "print",
  matchNumbers,
  planNumbers,
  editableNumbers = false,
  matLabel,
  attendTime,
}: BracketSheetProps) {
  const bodyWidth = sheetWidth - SHEET_PAD_X * 2;
  const withResults = variant === "print" && draw.structure.roundCount > 0;
  // برگه های زمین بندی شده یک ردیف «زمین/ساعت» درشت هم دارند — سربرگ کمی بلندتر
  const hasMatBadge = Boolean(matLabel || attendTime);
  const headerHeight = hasMatBadge ? 134 : HEADER_HEIGHT;
  const isSolo = draw.structure.roundCount === 0;

  /**
   * صفحه بندی معنایی چاپ: تا ۱۶ نفره یک صفحه کامل؛ از ۳۲ نفره به بالا چند
   * صفحه نوار (۸ ردیفی، دورهای ۱ تا ۳) + یک صفحه پایانی (نیمه نهایی و فینال
   * و قهرمان). همه صفحه ها با ابعاد یکسان و درشت رندر می شوند.
   */
  const plans = useMemo(() => buildStagedPrintPlans(draw.structure), [draw.structure]);

  // چاپ/PDF = صفحه بندی شده؛ عکس تلگرامی و پیش نمایش تعاملی حالت جدولی = تک برگه
  const paged = variant === "print" && !editableNumbers && !isSolo && plans.length > 1;

  const wholeDims: LayoutDims = fitPrintDims(draw.structure.roundCount, bodyWidth);
  const wholeLayout = useMemo(
    () => computeBracketLayout(draw.structure, wholeDims),
    [draw.structure, wholeDims],
  );

  function renderLeaf(leaf: PlanLeaf | null, side: SlotSide, dims: LayoutDims) {
    if (leaf?.kind === "winner") return <WinnerRow matchNumber={leaf.matchNumber} side={side} />;
    if (leaf?.kind !== "slot") return <PositionRow side={side} />;
    const occupant = draw.assignments[leaf.slotId];
    if (occupant.kind === "bye") return <ByeRow side={side} />;
    const participant =
      occupant.kind === "participant" ? participantsById.get(occupant.participantId) : undefined;
    if (!participant) return <PositionRow side={side} />;
    return (
      <AthleteRow
        participant={participant}
        side={side}
        nameFontSize={dims.nameFontSize}
        coachFontSize={dims.subFontSize}
        showCoach={dims.showCoach}
      />
    );
  }

  function renderHeader() {
    const belt = beltColorFor(draw.groupId);
    const participantCount = draw.group.participantIds.length;
    const restCount = draw.structure.restSlotIds.length;
    const title = meta.title || "قرعه کشی مسابقات تکواندو";

    return (
      <header
        style={{
          height: headerHeight,
          flexShrink: 0,
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center",
          gap: 16,
          padding: `0 ${SHEET_PAD_X}px`,
          borderBottom: "2.5px solid #101d31",
        }}
      >
        {/* right (RTL start): the one and only logo */}
        <div style={{ justifySelf: "start", minWidth: 0 }}>
          {meta.logoDataUrl && (
            <img
              src={meta.logoDataUrl}
              alt=""
              style={{
                width: 74,
                height: 74,
                objectFit: "contain",
                flexShrink: 0,
              }}
            />
          )}
        </div>

        {/* centre: the title block, properly centred on the page */}
        <div style={{ minWidth: 0, maxWidth: 620 }}>
          <h1
            style={{
              fontFamily: "Lalezar, Vazirmatn, sans-serif",
              fontSize: meta.title ? 30 : 26,
              lineHeight: 1.25,
              margin: 0,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              textAlign: "center",
            }}
          >
            {title}
          </h1>
          {/* زیرعنوان اختیاری از تنظیمات — برچسب های ثابت قبلی («نظام حذفی تک حذفی
              — برگه قرعه کشی») حذف شدند؛ چیزی که کاربر نخواسته روی برگه نمی نشیند */}
          {meta.subtitle && (
            <p
              style={{
                fontSize: 12.5,
                color: "#5b6b82",
                margin: "3px 0 0",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                textAlign: "center",
              }}
            >
              {meta.subtitle}
            </p>
          )}
          <p
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              margin: "4px 0 0",
              fontSize: 15,
              fontWeight: 700,
              whiteSpace: "nowrap",
            }}
          >
            <span
              aria-hidden
              style={{
                width: 12,
                height: 12,
                borderRadius: 3,
                backgroundColor: belt.hex,
                border: belt.needsBorder ? "1px solid #b9c5d6" : undefined,
                flexShrink: 0,
              }}
            />
            {renderWeightTitle(meta.sheetTitleFormat, {
              ageCategory: draw.group.ageCategory,
              weightCategory: draw.group.weightCategory,
              tournamentTitle: meta.title,
            })}
          </p>
          {/* زمین و ساعت حضور — درشت و خوانا تا از دور دیده شود */}
          {hasMatBadge && (
            <p
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                margin: "7px 0 0",
                whiteSpace: "nowrap",
              }}
            >
              {matLabel && (
                <span
                  style={{
                    fontFamily: "Lalezar, Vazirmatn, sans-serif",
                    fontSize: 21,
                    lineHeight: 1,
                    color: "#ffffff",
                    backgroundColor: "#1e3a5f",
                    borderRadius: 8,
                    padding: "6px 18px 8px",
                    letterSpacing: 0.5,
                  }}
                >
                  {matLabel}
                </span>
              )}
              {attendTime && (
                <span
                  style={{
                    fontFamily: "Lalezar, Vazirmatn, sans-serif",
                    fontSize: 21,
                    lineHeight: 1,
                    color: "#1e3a5f",
                    backgroundColor: "#ffffff",
                    border: "2px solid #1e3a5f",
                    borderRadius: 8,
                    padding: "4px 16px 6px",
                    letterSpacing: 0.5,
                  }}
                >
                  ساعت {toFaDigits(attendTime)}
                </span>
              )}
            </p>
          )}
        </div>

        {/* left (RTL end): the numbers of this sheet — no second logo */}
        <div style={{ justifySelf: "end", flexShrink: 0 }}>
          <div
            style={{
              display: "flex",
              border: "1.5px solid #b9c5d6",
              borderRadius: 10,
              overflow: "hidden",
            }}
          >
            <StatCell label="شرکت کننده" value={toFaDigits(participantCount)} large />
            <StatCell
              label="مسابقه"
              value={toFaDigits(realMatchCount(draw))}
              divider
              large
            />
            <StatCell label="استراحت" value={toFaDigits(restCount)} divider large />
          </div>
        </div>
      </header>
    );
  }

  function renderBand(layout: BracketLayout, dims: LayoutDims) {
    return (
      <div
        style={{
          position: "relative",
          width: Math.min(bodyWidth, layout.width),
          height: layout.height,
          flexShrink: 0,
        }}
      >
        <div
          dir="ltr"
          style={{
            position: "absolute",
            left: (bodyWidth - layout.width) / 2,
            top: 0,
            width: layout.width,
            height: layout.height,
          }}
        >
          <svg
            width={layout.width}
            height={layout.height}
            style={{ position: "absolute", inset: 0 }}
          >
            {layout.connectors.map((points, connectorIndex) => (
              <polyline
                key={connectorIndex}
                points={points.map((point) => `${point.x},${point.y}`).join(" ")}
                fill="none"
                stroke="#475569"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
          </svg>

          {layout.columns.map((column, columnIndex) => (
            <div
              key={`${column.round}-${columnIndex}`}
              dir="rtl"
              style={{
                position: "absolute",
                left: column.x,
                top: 12,
                width: Math.max(64, dims.columnPitch - 8),
                transform: "translateX(-50%)",
              }}
            >
              <FitText
                text={roundLabel(column.round, draw.structure.roundCount)}
                baseSize={12.5}
                minSize={8}
                align="center"
                className="font-bold"
                style={{ color: "#27405f" }}
              />
            </div>
          ))}

          {layout.matches.map((match) => (
            <div
              key={match.matchId}
              style={{
                position: "absolute",
                left: match.x,
                top: match.y,
                width: match.width,
                height: match.height,
              }}
            >
              <MatchBox
                match={match}
                roundCount={draw.structure.roundCount}
                dims={dims}
                renderLeaf={(leaf, side) => renderLeaf(leaf, side, dims)}
              />
            </div>
          ))}

          {layout.champion && (
            <div
              dir="rtl"
              style={{
                position: "absolute",
                left: layout.champion.x,
                top: layout.champion.y,
                width: layout.champion.width,
                height: layout.champion.height,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "linear-gradient(135deg, #fbbf24, #d97706)",
                borderRadius: 10,
                color: "#ffffff",
                fontFamily: "Lalezar, Vazirmatn, sans-serif",
                fontSize: 22,
                letterSpacing: 1.5,
                boxShadow: "0 2px 8px rgba(180, 83, 9, 0.35)",
              }}
            >
              قهرمان
            </div>
          )}

          {layout.continuePoint && (
            <div
              dir="rtl"
              style={{
                position: "absolute",
                left: layout.continuePoint.x,
                top: layout.continuePoint.y,
                transform: "translate(-50%, -50%)",
                whiteSpace: "nowrap",
                fontSize: 11.5,
                fontWeight: 700,
                color: "#1e3a5f",
                backgroundColor: "#eef2f7",
                border: "1.5px solid #b9c5d6",
                borderRadius: 999,
                padding: "4px 14px",
              }}
            >
              ادامه در صفحه بعد
            </div>
          )}

          {layout.matches
            .filter((match) => match.contested)
            .map((match) => {
              const isFinal = match.round === draw.structure.roundCount;
              const chipSize = dims.chipSize;
              const accent = isFinal ? FINAL_GOLD : "#1e3a5f";
              const key = `${draw.groupId}/${match.matchId}`;
              const text = matchNumbers?.get(key) ?? "";
              if (editableNumbers) {
                return (
                  <SheetNumberChip
                    key={`chip-${match.matchId}`}
                    groupId={draw.groupId}
                    matchId={match.matchId}
                    isFinal={isFinal}
                    chipX={match.chipX}
                    chipY={match.chipY}
                    size={chipSize}
                    planText={planNumbers?.get(key)}
                    effectiveText={text}
                  />
                );
              }
              return (
                <div
                  key={`chip-${match.matchId}`}
                  title={
                    text
                      ? `مسابقه شماره ${text}`
                      : "شماره مسابقه را دستی بنویسید"
                  }
                  style={{
                    position: "absolute",
                    left: match.chipX - chipSize / 2,
                    top: match.chipY - chipSize / 2,
                    width: chipSize,
                    height: chipSize,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: text ? accent : "#ffffff",
                    color: text ? "#ffffff" : undefined,
                    fontSize: Math.round(chipSize * 0.44),
                    fontWeight: 700,
                    lineHeight: 1,
                    border: `2px solid ${accent}`,
                    borderRadius: 999,
                    boxShadow: "0 1px 2px rgba(15, 31, 56, 0.18)",
                  }}
                >
                  {text}
                </div>
              );
            })}
        </div>
      </div>
    );
  }

  function renderResults() {
    return withResults ? (
      <ResultsTable withBronze={Boolean(draw.structure.bronzeMatch)} />
    ) : null;
  }

  const sheetStyle: React.CSSProperties = {
    width: sheetWidth,
    backgroundColor: "#ffffff",
    color: "#101d31",
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    overflow: "hidden",
    fontFamily: "Vazirmatn, sans-serif",
  };

  // ————— مسیر تک برگه: عکس تلگرامی، پیش نمایش تعاملی و برگه های تک صفحه ای —————
  if (!paged) {
    const soloContent = isSolo && (
      <SoloWinnerStatement solo={findSoloParticipant(draw, participantsById)} />
    );
    const wholeHeight = isSolo
      ? pageHeight
      : headerHeight +
        8 +
        wholeLayout.height +
        (withResults ? 12 + RESULTS_HEIGHT : 14) +
        12;
    return (
      <div
        id={`pdf-sheet-${index}`}
        className={`print-sheet print-page ${variant === "print" ? "shadow-2xl" : ""}`}
        dir="rtl"
        style={{ ...sheetStyle, height: wholeHeight }}
      >
        {isSolo ? (
          <main
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: `0 ${SHEET_PAD_X}px`,
            }}
          >
            {soloContent}
          </main>
        ) : (
          <>
            {renderHeader()}
            <main
              style={{
                flex: 1,
                padding: `8px ${SHEET_PAD_X}px 0`,
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
              }}
            >
              {renderBand(wholeLayout, wholeDims)}
              {renderResults()}
            </main>
          </>
        )}
      </div>
    );
  }

  // ————— مسیر چند صفحه ای: صفحات نوار + صفحه پایانی، همه با ابعاد یکسان —————
  return (
    <div data-pdf-group={index} data-page-count={plans.length}>
      {plans.map((plan, page) => {
        const dims = fitPrintDims(plan.columns, bodyWidth);
        const layout = computePlanLayout(plan.plan, dims);
        const isFirst = page === 0;
        const isLast = page === plans.length - 1;
        const showResults = withResults && isLast;
        const note = plan.kind === "band" ? "ادامه ردیف های دور ۱" : "دورهای پایانی";
        return (
          <div
            key={page}
            className="print-page pdf-page shadow-2xl"
            style={{ ...sheetStyle, height: pageHeight }}
          >
            {isFirst ? (
              renderHeader()
            ) : (
              <ContinuationHeader
                draw={draw}
                meta={meta}
                note={note}
                page={page}
                total={plans.length}
              />
            )}
            <main
              style={{
                flex: 1,
                minHeight: 0,
                padding: `8px ${SHEET_PAD_X}px 14px`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
              }}
            >
              {renderBand(layout, dims)}
              {showResults && <ResultsTable withBronze={Boolean(draw.structure.bronzeMatch)} />}
            </main>
          </div>
        );
      })}
    </div>
  );
}

/** نوار باریک بالای صفحات ادامه — تا برگه های چند صفحه ای گم نشوند */
function ContinuationHeader({
  draw,
  meta,
  note,
  page,
  total,
}: {
  draw: GroupDraw;
  meta: TournamentMeta;
  note: string;
  page: number;
  total: number;
}) {
  return (
    <div
      dir="rtl"
      style={{
        height: 34,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: `0 ${SHEET_PAD_X}px`,
        borderBottom: "1.5px solid #101d31",
      }}
    >
      <span
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 11.5,
          fontWeight: 700,
          whiteSpace: "nowrap",
          overflow: "hidden",
        }}
      >
        {meta.title && <span>{meta.title} —</span>}
        {renderWeightTitle(meta.sheetTitleFormat, {
          ageCategory: draw.group.ageCategory,
          weightCategory: draw.group.weightCategory,
          tournamentTitle: meta.title,
        })}
        <span style={{ fontSize: 10.5, fontWeight: 500, color: "#5b6b82" }}>— {note}</span>
      </span>
      <span style={{ fontSize: 10.5, color: "#5b6b82", whiteSpace: "nowrap" }}>
        صفحه {toFaDigits(page + 1)} از {toFaDigits(total)}
      </span>
    </div>
  );
}

/**
 * Hand-written final standings at the bottom of the sheet: 1st, 2nd and the
 * two shared 3rd places of a single-elimination draw. Deliberately compact —
 * a small 2×2 card in the middle, leaving the bracket the lion's share of the
 * page. Referees fill the dotted lines with a pen after the matches.
 */
function ResultsTable({ withBronze }: { withBronze: boolean }) {
  // باران مدال: مسابقه رده بندی رتبه ها را کامل می کند — ۱ تا ۴ بدون مشترک شدن
  const ranks = withBronze
    ? ["نفر اول", "نفر دوم", "نفر سوم", "نفر چهارم"]
    : ["نفر اول", "نفر دوم", "نفر سوم (مشترک)", "نفر سوم (مشترک)"];
  return (
    <div
      style={{
        width: "100%",
        maxWidth: 420,
        flexShrink: 0,
        border: "1.5px solid #94a3b8",
        borderRadius: 10,
        overflow: "hidden",
        backgroundColor: "#ffffff",
      }}
    >
      <div
        dir="rtl"
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 10,
          backgroundColor: "#1e3a5f",
          color: "#ffffff",
          padding: "4px 12px",
        }}
      >
        <span style={{ fontSize: 11.5, fontWeight: 700, whiteSpace: "nowrap" }}>
          نتایج نهایی
        </span>
        <span style={{ fontSize: 8.5, color: "#c7d4e6" }}>
          نام و نام خانوادگی ورزشکار را پس از هر مسابقه بنویسید
        </span>
      </div>
      <div dir="rtl" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", backgroundColor: "#ffffff" }}>
        {ranks.map((rank, index) => (
          <div
            key={rank + index}
            style={{
              padding: "4px 12px 7px",
              borderTop: index >= 2 ? "1px solid #cbd5e1" : undefined,
              borderInlineEnd: index % 2 === 0 ? "1px solid #cbd5e1" : undefined,
              backgroundColor: "#ffffff",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 10,
                fontWeight: 700,
                color: "#27405f",
                whiteSpace: "nowrap",
              }}
            >
              {rank}
            </p>
            <div
              aria-hidden
              style={{ marginTop: 6, height: 14, borderBottom: "1.5px dotted #7e93af" }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Editable match-number circle for the interactive tables view: the same
 * geometry as the printed chip, but a real input wired to the store. A typed
 * number overrides the mat plan everywhere (plan sheet, bracket canvas, print
 * sheets); Escape clears the manual number and falls back to the plan.
 * خواندن/نوشتن، رنگ و راهنما از «matchNumberField» مشترک می آید — همان منبع
 * چipt بوم قرعه و بج فهرست برنامه.
 */
function SheetNumberChip({
  groupId,
  matchId,
  isFinal,
  chipX,
  chipY,
  size,
  planText,
  effectiveText,
}: {
  groupId: string;
  matchId: string;
  isFinal: boolean;
  chipX: number;
  chipY: number;
  size: number;
  planText?: string;
  effectiveText?: string;
}) {
  const { override, focused, setFocused, setValue, onKeyDown } = useMatchNumberField(
    groupId,
    matchId,
  );
  const rawValue = override || effectiveText || "";
  // نمایش رقم فارسی — در حین تایپ همان که کاربر می نویسد دیده می شود
  const value = focused ? override : toFaDigits(rawValue);
  const filled = rawValue.length > 0;
  const { accent, halo } = matchChipTone(isFinal);
  const tooltip = matchNumberTooltip({
    override,
    planText: override ? planText : effectiveText,
  });

  return (
    <input
      value={value}
      onChange={(event) => setValue(event.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onKeyDown={onKeyDown}
      maxLength={4}
      dir="ltr"
      inputMode="numeric"
      autoComplete="off"
      spellCheck={false}
      aria-label="شماره مسابقه"
      title={tooltip}
      style={{
        position: "absolute",
        left: chipX - size / 2,
        top: chipY - size / 2,
        width: size,
        height: size,
        padding: 0,
        borderRadius: 999,
        textAlign: "center",
        fontSize: Math.round(size * 0.48),
        fontWeight: 700,
        lineHeight: 1,
        caretColor: accent,
        color: filled ? "#ffffff" : "#94a3b8",
        cursor: filled ? "default" : "text",
        ...(filled
          ? {
              border: `2px solid ${accent}`,
              backgroundColor: accent,
              boxShadow: focused
                ? `0 0 0 3px ${halo}, 0 1px 3px rgba(15, 31, 56, 0.35)`
                : "0 1px 2px rgba(15, 31, 56, 0.18)",
            }
          : {
              border: `2px dashed ${focused ? accent : "#cbd5e1"}`,
              backgroundColor: focused ? "#fffbeb" : "#ffffff",
              boxShadow: focused ? `0 0 0 3px ${halo}` : undefined,
            }),
      }}
    />
  );
}

function SoloWinnerStatement({ solo }: { solo: Participant | null }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        padding: "30px 0",
      }}
    >
      <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: "#5b6b82" }}>
        تنها شرکت کننده این دسته وزنی
      </p>
      <p
        style={{
          margin: 0,
          fontFamily: "Lalezar, Vazirmatn, sans-serif",
          fontSize: 32,
          lineHeight: 1.25,
          color: "#101d31",
        }}
      >
        {solo?.fullName ?? "—"}
      </p>
      {solo && (
        <p style={{ margin: 0, fontSize: 13.5, color: "#5b6b82" }}>مربی: {solo.coachName}</p>
      )}
      <p
        style={{
          margin: "10px 0 0",
          maxWidth: 640,
          fontSize: 13,
          lineHeight: 1.9,
          textAlign: "center",
          backgroundColor: "#fdf7e7",
          border: "1px solid #e3cf9a",
          borderRadius: 8,
          padding: "10px 20px",
          color: "#27405f",
        }}
      >
        بدون برگزاری مسابقه، به طور خودکار قهرمان این وزن اعلام می شود.
      </p>
    </div>
  );
}
