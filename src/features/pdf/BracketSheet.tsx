import { useMemo } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import type { GroupDraw, Participant } from "../../core/types.ts";
import {
  buildStagedPrintPlans,
  computeBracketLayout,
  computePlanLayout,
  barSideForMatch,
  fitPrintDims,
  type BracketLayout,
  type LayoutDims,
  type LayoutMatch,
  type PlanLeaf,
  type SlotSide,
} from "../../core/bracket/layout.ts";
import type { TournamentMeta } from "../../store/tournamentStore.ts";
import { useTournament } from "../../store/tournamentStore.ts";
import { renderWeightTitle, toFaDigits } from "../../lib/formatFa.ts";
import {
  matchChipFactor,
  matchChipPalette,
  matchChipRadius,
} from "../../lib/matchChipStyles.ts";
import {
  TableThemeScope,
  useTableTheme,
} from "../../lib/tableThemeContext.ts";
import {
  tableThemeById,
} from "../../lib/tableThemes.ts";
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
import {
  matchNumberTooltip,
  useMatchNumberField,
} from "../bracket/matchNumberField.ts";

/** A4 landscape at 96 dpi */
export const sheetWidth = 1120;
/** ارتفاع یک صفحه A4 افقی روی برگه — همه صفحه های چاپ با همین قطع رندر می شوند */
export const pageHeight = 770;

const HEADER_HEIGHT = 104;
const SHEET_PAD_X = 30;

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
  /**
   * کمربند دستی این جدول — مثلا «سبز و آبی» — کاربر خودش تایپ می کند و به
   * شکل یک بج کوچک کنار عنوان وزن روی سربرگ می نشیند (عمدا خیلی کوچک تر از
   * بج های زمین و ساعت).
   */
  beltLabel?: string;
  /**
   * حالت تعاملی دوم (پیش نمایش «حالت جدولی»): ردیف هر هنرجو قابل کشیدن و هر
   * خانه قابل رها کردن است — جای دو هنرجو عوض می شود؛ رها کردن روی گوشه
   * «استراحت» هم استراحت را به هنرجوی کشیده شده منتقل می کند (تعویض با صاحب
   * کنونی استراحت). فقط برای تعویض داخل همان جدول — رها کردن روی جدول دیگر
   * بی اثر است.
   */
  interactiveSwaps?: boolean;
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
  beltLabel,
  interactiveSwaps = false,
}: BracketSheetProps) {
  // تم جدول — از تنظیمات؛ برگه و همه خروجی هایش با همین رنگ می نشیند
  const tableThemeId = useTournament((state) => state.tableThemeId);
  const theme = tableThemeById(tableThemeId);
  // ظاهر بج شماره مسابقه — شکل و رنگ دلخواه از تنظیمات
  const matchChipStyle = useTournament((state) => state.matchChipStyle);
  // اندازه بج شماره — ضریب روی اندازه پایه چیدمان
  const matchChipSize = useTournament((state) => state.matchChipSize);
  const chipScale = matchChipFactor(matchChipSize);
  // پلاک «قهرمان» زیر فینال — از تنظیمات فعال/غیرفعال می شود
  const showChampion = useTournament((state) => state.showChampion);
  // طرح برگه — کلاسیک (ظاهر همیشگی) یا مدرن (وسط چین با کادرهای نازک و ردیف های کادردار)
  const sheetLayout = useTournament((state) => state.sheetLayout);
  const modern = sheetLayout === "modern";
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

  // چاپ/PDF و عکس تلگرامی هر دو صفحه بندی شده رندر می شوند تا همه خروجی ها
  // قطع یکسان A4 بگیرند؛ فقط پیش نمایش های تعاملی تک برگه می مانند
  const paged = !editableNumbers && !isSolo && plans.length > 1;

  const wholeDims: LayoutDims = fitPrintDims(draw.structure.roundCount, bodyWidth);
  const wholeLayout = useMemo(
    () => computeBracketLayout(draw.structure, wholeDims, { showChampion }),
    [draw.structure, wholeDims, showChampion],
  );

  function renderLeaf(
    leaf: PlanLeaf | null,
    side: SlotSide,
    dims: LayoutDims,
    match?: LayoutMatch,
    barSide?: "left" | "right",
  ) {
    if (leaf?.kind === "winner")
      return (
        <WinnerRow
          matchNumber={leaf.matchNumber}
          side={side}
          barSide={barSide}
          design={sheetLayout}
        />
      );
    if (leaf?.kind !== "slot") return <PositionRow side={side} />;
    const occupant = draw.assignments[leaf.slotId];
    if (occupant.kind === "bye") {
      // رها کردن هنرجو روی گوشه استراحت = انتقال استراحت: تعویض با صاحب کنونی
      // استراحت (هنرجوی خانه همسایه همین مسابقه)
      if (interactiveSwaps && match) {
        const siblingSlotId =
          match.topSlotId === leaf.slotId ? match.bottomSlotId : match.topSlotId;
        const sibling = siblingSlotId ? draw.assignments[siblingSlotId] : undefined;
        if (siblingSlotId && sibling?.kind === "participant") {
          return (
            <SheetDropZone
              dropId={`${draw.groupId}::${siblingSlotId}`}
              hint="رها کردن هنرجو اینجا، استراحت را به او می دهد و صاحب کنونی استراحت جای او می نشیند"
            >
              <ByeRow side={side} />
            </SheetDropZone>
          );
        }
      }
      return <ByeRow side={side} />;
    }
    const participant =
      occupant.kind === "participant" ? participantsById.get(occupant.participantId) : undefined;
    if (!participant) return <PositionRow side={side} />;
    const row = (
      <AthleteRow
        participant={participant}
        side={side}
        nameFontSize={dims.nameFontSize}
        coachFontSize={dims.subFontSize}
        showCoach={dims.showCoach}
        barSide={barSide}
        design={sheetLayout}
      />
    );
    if (!interactiveSwaps) return row;
    return (
      <SheetDropZone dropId={`${draw.groupId}::${leaf.slotId}`}>
        <SheetDragChip
          groupId={draw.groupId}
          slotId={leaf.slotId}
          participant={participant}
        >
          {row}
        </SheetDragChip>
      </SheetDropZone>
    );
  }

  function renderHeader() {
    return modern ? renderModernHeader() : renderClassicHeader();
  }

  /** سربرگ طرح مدرن — متعادل: وسط چین و باز، اما با کادرهای نازک تا برگه
   *  بی شخصیت نماند (بازخورد کاربر: «نه شلوغی نه خلوتی — یذره کادر بده»).
   *  جداکننده نازک زیر سربرگ (در برابر خط پهن کلاسیک)، عنوان وزن در چیپ
   *  کم رنگ، آمار در یک کادر نازک — زمین/ساعت مثل قبل پر می گیرند تا از دور
   *  دیده شوند؛ همه رنگ ها از همان تم جدول می آید */
  function renderModernHeader() {
    const participantCount = draw.group.participantIds.length;
    const restCount = draw.structure.restSlotIds.length;
    const title = meta.title || "قرعه کشی مسابقات تکواندو";

    return (
      <header
        style={{
          height: headerHeight,
          flexShrink: 0,
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
          padding: `3px ${SHEET_PAD_X}px 5px`,
          // جداکننده نازک و ملایم — امضای «کادر دار اما خلوتی» مدرن؛ خط پهن
          // تیره زیر سربرگ اختصاصی طرح کلاسیک می ماند
          borderBottom: `1px solid ${theme.statBorder}`,
        }}
      >
        {/* لوگو بدون کاشی — لبه شروع سربرگ، وسط چین بودن بقیه را به هم نمی زند */}
        {meta.logoDataUrl && (
          <img
            src={meta.logoDataUrl}
            alt=""
            style={{
              position: "absolute",
              insetInlineStart: SHEET_PAD_X,
              top: "50%",
              transform: "translateY(-50%)",
              width: 62,
              height: 62,
              objectFit: "contain",
            }}
          />
        )}
        <h1
          style={{
            fontFamily: "Lalezar, Vazirmatn, sans-serif",
            fontSize: 26,
            lineHeight: 1.15,
            margin: 0,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            textAlign: "center",
            maxWidth: 720,
            color: theme.titleText,
          }}
        >
          {title}
        </h1>
        {meta.subtitle && (
          <p
            style={{
              fontSize: 11.5,
              lineHeight: 1.2,
              color: theme.subtitleText,
              margin: 0,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              textAlign: "center",
              maxWidth: 680,
            }}
          >
            {meta.subtitle}
          </p>
        )}
        {/* بج ها — عنوان وزن در چیپ کم رنگ کادردار؛ کمربند متن ساده می ماند؛
            زمین و ساعت پر می گیرند تا از دور دیده شوند */}
        <p
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            margin: 0,
            whiteSpace: "nowrap",
            overflow: "hidden",
          }}
        >
          <span
            style={{
              fontSize: 15,
              fontWeight: 700,
              lineHeight: 1.2,
              color: theme.chipText,
              backgroundColor: theme.chipBg,
              border: `1px solid ${theme.chipBorder}`,
              borderRadius: 8,
              padding: "2px 14px 3px",
            }}
          >
            {renderWeightTitle(meta.sheetTitleFormat, {
              ageCategory: draw.group.ageCategory,
              weightCategory: draw.group.weightCategory,
              tournamentTitle: meta.title,
            })}
          </span>
          {beltLabel && (
            <span style={{ fontSize: 12, lineHeight: 1.2, fontWeight: 600, color: theme.subtitleText }}>
              کمربند {beltLabel}
            </span>
          )}
          {matLabel && (
            <span
              style={{
                fontFamily: "Lalezar, Vazirmatn, sans-serif",
                fontSize: 15.5,
                lineHeight: 1,
                letterSpacing: 0.5,
                color: theme.matBadgeText,
                backgroundColor: theme.matBadgeBg,
                borderRadius: 8,
                padding: "2.5px 13px 4.5px",
              }}
            >
              {matLabel}
            </span>
          )}
          {attendTime && (
            <span
              style={{
                fontFamily: "Lalezar, Vazirmatn, sans-serif",
                fontSize: 15.5,
                lineHeight: 1,
                letterSpacing: 0.5,
                color: theme.timeBadgeText,
                backgroundColor: theme.timeBadgeBg,
                borderRadius: 8,
                padding: "2px 13px 4px",
              }}
            >
              ساعت {toFaDigits(attendTime)}
            </span>
          )}
        </p>
        {/* آمار — یک خط متن داخل کادر نازک؛ همسایه امضای جعبه آمار کلاسیک اما خیلی سبک تر */}
        <p
          style={{
            margin: 0,
            fontSize: 11,
            lineHeight: 1.2,
            fontWeight: 500,
            color: theme.statLabel,
            whiteSpace: "nowrap",
            border: `1px solid ${theme.statBorder}`,
            borderRadius: 8,
            padding: "2px 12px 3px",
          }}
        >
          شرکت کننده {toFaDigits(participantCount)} · مسابقه {toFaDigits(realMatchCount(draw))} · استراحت {toFaDigits(restCount)}
        </p>
      </header>
    );
  }

  function renderClassicHeader() {
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
          borderBottom: `2.5px solid ${theme.headerRule}`,
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
              color: theme.titleText,
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
                color: theme.subtitleText,
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
              overflow: "hidden",
            }}
          >
            {renderWeightTitle(meta.sheetTitleFormat, {
              ageCategory: draw.group.ageCategory,
              weightCategory: draw.group.weightCategory,
              tournamentTitle: meta.title,
            })}
            {/* کمربند دستی — بج کوچک کنار عنوان، خیلی کوچک تر از بج های زمین/ساعت */}
            {beltLabel && (
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: theme.chipText,
                  backgroundColor: theme.chipBg,
                  border: `1px solid ${theme.chipBorder}`,
                  borderRadius: 999,
                  padding: "2.5px 12px 3.5px",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                کمربند {beltLabel}
              </span>
            )}
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
                    color: theme.matBadgeText,
                    backgroundColor: theme.matBadgeBg,
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
                    color: theme.timeBadgeText,
                    backgroundColor: theme.timeBadgeBg,
                    border: `2px solid ${theme.timeBadgeBorder}`,
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
              border: `1.5px solid ${theme.statBorder}`,
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
            // وقتی چیدمان از بدنه کوتاه تر است (جدول دو نفره) همان جا می ماند —
            // جعبه بیرونی خودش وسط است؛ آفست منفی فقط برای چیدمان پهن تر از بدنه
            left: Math.min(0, (bodyWidth - layout.width) / 2),
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
                stroke={theme.connector}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={modern ? "7 5" : undefined}
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
                top: 3,
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
                style={{ color: theme.roundLabel }}
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
                design={sheetLayout}
                renderLeaf={(leaf, side) =>
                  renderLeaf(leaf, side, dims, match, barSideForMatch(match, layout.width))
                }
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
                background: `linear-gradient(135deg, ${theme.championFrom}, ${theme.championTo})`,
                borderRadius: 10,
                color: theme.championText,
                fontFamily: "Lalezar, Vazirmatn, sans-serif",
                fontSize: 22,
                letterSpacing: 1.5,
                boxShadow: theme.championShadow,
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
                color: theme.continueText,
                backgroundColor: theme.continueBg,
                border: `1.5px solid ${theme.continueBorder}`,
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
              // اندازه بج — اندازه پایه چیدمان × ضریب انتخابی تنظیمات
              const chipSize = Math.round(dims.chipSize * chipScale);
              // رنگ بج — رنگ دلخواه کاربر یا رنگ تم؛ فینال همراه تم طلایی می ماند
              const palette = matchChipPalette(matchChipStyle, theme, isFinal);
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
                    backgroundColor: text
                      ? matchChipStyle.fill === "solid"
                        ? palette.accent
                        : palette.outlineBg
                      : palette.emptyBg,
                    color: text
                      ? matchChipStyle.fill === "solid"
                        ? palette.filledText
                        : palette.accent
                      : undefined,
                    fontSize: Math.round(chipSize * 0.44),
                    fontWeight: 700,
                    lineHeight: 1,
                    border: `2px solid ${palette.accent}`,
                    borderRadius: matchChipRadius(matchChipStyle.shape, chipSize),
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
    backgroundColor: theme.sheetBg,
    color: theme.sheetText,
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    overflow: "hidden",
    fontFamily: "Vazirmatn, sans-serif",
  };

  // ————— مسیر تک برگه: همیشه یک صفحه کامل A4 با ارتفاع ثابت —————
  // برگه های کوچک (۲ و ۴ نفره) هم با همین قطع رندر می شوند تا خروجی عکس همه
  // جدول ها — از ۲ تا ۱۶ نفره — هم اندازه و هم قطع باشد؛ محتوا وسط صفحه می نشیند
  if (!paged) {
    const soloContent = isSolo && (
      <SoloWinnerStatement solo={findSoloParticipant(draw, participantsById)} />
    );
    return (
      <TableThemeScope theme={theme}>
        <div
          id={`pdf-sheet-${index}`}
          data-sheet-layout={sheetLayout}
          className={`print-sheet print-page ${variant === "print" ? "shadow-2xl" : ""}`}
          dir="rtl"
          style={{ ...sheetStyle, height: pageHeight }}
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
                  justifyContent: "center",
                  gap: 12,
                }}
              >
                {renderBand(wholeLayout, wholeDims)}
                {renderResults()}
              </main>
            </>
          )}
        </div>
      </TableThemeScope>
    );
  }

  // ————— مسیر چند صفحه ای: صفحات نوار + صفحه پایانی، همه با ابعاد یکسان —————
  return (
    <TableThemeScope theme={theme}>
      <div data-pdf-group={index} data-page-count={plans.length}>
      {plans.map((plan, page) => {
        const dims = fitPrintDims(plan.columns, bodyWidth);
        const layout = computePlanLayout(plan.plan, dims, undefined, { showChampion });
        const isFirst = page === 0;
        const isLast = page === plans.length - 1;
        const showResults = withResults && isLast;
        const note = plan.kind === "band" ? "ادامه ردیف های دور ۱" : "دورهای پایانی";
        return (
          <div
            key={page}
            data-sheet-layout={sheetLayout}
            className={`print-page pdf-page ${variant === "print" ? "shadow-2xl" : ""}`}
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
              {showResults && (
                <ResultsTable withBronze={Boolean(draw.structure.bronzeMatch)} />
              )}
            </main>
          </div>
        );
      })}
      </div>
    </TableThemeScope>
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
  const theme = useTableTheme();
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
        borderBottom: `1.5px solid ${theme.contRule}`,
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
        <span style={{ fontSize: 10.5, fontWeight: 500, color: theme.contMuted }}>— {note}</span>
      </span>
      <span style={{ fontSize: 10.5, color: theme.contMuted, whiteSpace: "nowrap" }}>
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
  const theme = useTableTheme();
  return (
    <div
      style={{
        width: "100%",
        maxWidth: 420,
        flexShrink: 0,
        border: `1.5px solid ${theme.resultsBorder}`,
        borderRadius: 10,
        overflow: "hidden",
        backgroundColor: theme.resultsCellBg,
      }}
    >
      <div
        dir="rtl"
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 10,
          backgroundColor: theme.resultsHeaderBg,
          color: theme.resultsHeaderText,
          padding: "4px 12px",
        }}
      >
        <span
          style={{
            fontSize: 11.5,
            fontWeight: 700,
            whiteSpace: "nowrap",
          }}
        >
          نتایج نهایی
        </span>
        <span
          style={{
            fontSize: 8.5,
            color: theme.resultsHeaderSub,
          }}
        >
          نام و نام خانوادگی ورزشکار را پس از هر مسابقه بنویسید
        </span>
      </div>
      <div dir="rtl" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", backgroundColor: theme.resultsCellBg }}>
        {ranks.map((rank, index) => (
          <div
            key={rank + index}
            style={{
              padding: "4px 12px 7px",
              borderTop: index >= 2 ? `1px solid ${theme.resultsInnerBorder}` : undefined,
              borderInlineEnd: index % 2 === 0 ? `1px solid ${theme.resultsInnerBorder}` : undefined,
              backgroundColor: theme.resultsCellBg,
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 10,
                fontWeight: 700,
                color: theme.resultsRankText,
                whiteSpace: "nowrap",
              }}
            >
              {rank}
            </p>
            <div
              aria-hidden
              style={{ marginTop: 6, height: 14, borderBottom: `1.5px dotted ${theme.resultsDotted}` }}
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
  // رنگ و شکل بج با تم جدول و انتخاب ظاهر شماره — فینال همراه تم طلایی می ماند
  const theme = useTableTheme();
  const chipStyle = useTournament((state) => state.matchChipStyle);
  const palette = matchChipPalette(chipStyle, theme, isFinal);
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
        borderRadius: matchChipRadius(chipStyle.shape, size),
        textAlign: "center",
        fontSize: Math.round(size * 0.48),
        fontWeight: 700,
        lineHeight: 1,
        caretColor: palette.accent,
        color: filled
          ? chipStyle.fill === "solid"
            ? palette.filledText
            : palette.accent
          : palette.emptyText,
        cursor: filled ? "default" : "text",
        ...(filled
          ? {
              border: `2px solid ${palette.accent}`,
              backgroundColor:
                chipStyle.fill === "solid" ? palette.accent : palette.outlineBg,
              boxShadow: focused
                ? `0 0 0 3px ${palette.halo}, 0 1px 3px rgba(15, 31, 56, 0.35)`
                : "0 1px 2px rgba(15, 31, 56, 0.18)",
            }
          : {
              border: `2px dashed ${focused ? palette.accent : palette.emptyBorder}`,
              backgroundColor: focused ? palette.focusBg : palette.emptyBg,
              boxShadow: focused ? `0 0 0 3px ${palette.halo}` : undefined,
            }),
      }}
    />
  );
}

function SoloWinnerStatement({ solo }: { solo: Participant | null }) {
  const theme = useTableTheme();
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
      <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: theme.soloMuted }}>
        تنها شرکت کننده این دسته وزنی
      </p>
      <p
        style={{
          margin: 0,
          fontFamily: "Lalezar, Vazirmatn, sans-serif",
          fontSize: 32,
          lineHeight: 1.25,
          color: theme.soloNameText,
        }}
      >
        {solo?.fullName ?? "—"}
      </p>
      {solo && (
        <p style={{ margin: 0, fontSize: 13.5, color: theme.soloMuted }}>مربی: {solo.coachName}</p>
      )}
      <p
        style={{
          margin: "10px 0 0",
          maxWidth: 640,
          fontSize: 13,
          lineHeight: 1.9,
          textAlign: "center",
          backgroundColor: theme.soloNoteBg,
          border: `1px solid ${theme.soloNoteBorder}`,
          borderRadius: 8,
          padding: "10px 20px",
          color: theme.soloNoteText,
        }}
      >
        بدون برگزاری مسابقه، به طور خودکار قهرمان این وزن اعلام می شود.
      </p>
    </div>
  );
}

/**
 * خانه قابل رها کردن برگه تعاملی — هنرجوی کشیده شده روی این خانه رها می شود و
 * جای دو خانه عوض می شود. حلقه سبز یعنی مقصد فعال است.
 */
function SheetDropZone({
  dropId,
  hint,
  children,
}: {
  dropId: string;
  hint?: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: dropId });
  return (
    <div
      ref={setNodeRef}
      title={hint}
      className={`h-full w-full rounded-md transition-shadow ${
        isOver ? "ring-2 ring-mat-600 ring-offset-1" : ""
      }`}
    >
      {children}
    </div>
  );
}

/**
 * ردیف قابل کشیدن هنرجو در برگه تعاملی — همان فیزیک بوم قرعه: کشیدن با فاصله
 * ۶ پیکسل فعال می شود تا کلیک ساده مزاحمش نشود.
 */
function SheetDragChip({
  groupId,
  slotId,
  participant,
  children,
}: {
  groupId: string;
  slotId: string;
  participant: Participant;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `sheet-drag:${groupId}::${slotId}`,
    data: { groupId, slotId },
  });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      aria-label={`جابه جایی ${participant.fullName}`}
      className={`h-full w-full cursor-grab touch-none active:cursor-grabbing ${
        isDragging ? "opacity-30" : ""
      }`}
    >
      {children}
    </div>
  );
}
