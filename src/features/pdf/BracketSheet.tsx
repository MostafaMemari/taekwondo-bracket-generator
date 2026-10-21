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
import type { SheetLayoutId } from "../../lib/sheetLayouts.ts";

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
  // طرح برگه — کلاسیک (ظاهر همیشگی)، مدرن (ریبون و پیل) یا تشریفاتی (قاب سند قهرمانی)
  const sheetLayout = useTournament((state) => state.sheetLayout);
  const modern = sheetLayout === "modern";
  const royal = sheetLayout === "royal";
  const bodyWidth = sheetWidth - SHEET_PAD_X * 2;
  const withResults = variant === "print" && draw.structure.roundCount > 0;
  // برگه های زمین بندی شده یک ردیف «زمین/ساعت» درشت هم دارند — سربرگ کمی بلندتر؛
  // تشریفاتی یک سطر جداکننده الماسی دار و یک سطر آمار اضافه دارد — کمی بلندتر
  const hasMatBadge = Boolean(matLabel || attendTime);
  const headerHeight = royal
    ? hasMatBadge
      ? 138
      : 120
    : hasMatBadge
      ? 134
      : HEADER_HEIGHT;
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
    return modern ? renderModernHeader() : royal ? renderRoyalHeader() : renderClassicHeader();
  }

  /** سربرگ طرح مدرن — ریبون رنگی لبه بالا (خود ریبون در بدنه برگه است)،
   *  لوگوی کاشی دار، عنوان با خط تزئینی دو طرف، همه بج ها پیل، و آمار به
   *  شکل سه پیل عمودی — همه رنگ ها از همان تم جدول می آید */
  function renderModernHeader() {
    const participantCount = draw.group.participantIds.length;
    const restCount = draw.structure.restSlotIds.length;
    const title = meta.title || "قرعه کشی مسابقات تکواندو";

    const pill: React.CSSProperties = {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      borderRadius: 999,
      backgroundColor: theme.chipBg,
      border: `1.5px solid ${theme.chipBorder}`,
      color: theme.chipText,
      padding: "3px 14px 4.5px",
      fontSize: 14,
      fontWeight: 700,
      whiteSpace: "nowrap",
      flexShrink: 0,
    };

    return (
      <header
        style={{
          height: headerHeight,
          flexShrink: 0,
          display: "grid",
          gridTemplateColumns: "auto 1fr auto",
          alignItems: "center",
          gap: 18,
          padding: `8px ${SHEET_PAD_X}px 10px`,
        }}
      >
        {/* راست: لوگوی کاشی دار — کادر گرد با پس زمینه تم */}
        <div style={{ justifySelf: "start", minWidth: 0 }}>
          {meta.logoDataUrl && (
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: 16,
                backgroundColor: theme.chipBg,
                border: `1.5px solid ${theme.chipBorder}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                boxShadow: "0 1px 3px rgba(15, 31, 56, 0.12)",
              }}
            >
              <img
                src={meta.logoDataUrl}
                alt=""
                style={{ maxWidth: 64, maxHeight: 64, objectFit: "contain" }}
              />
            </div>
          )}
        </div>

        {/* وسط: عنوان با خط تزئینی دو طرف + همه بج ها در یک ردیف پیل */}
        <div
          style={{
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              width: "100%",
              maxWidth: 660,
            }}
          >
            <span
              aria-hidden
              style={{
                flex: 1,
                height: 2,
                borderRadius: 999,
                background: `linear-gradient(to left, ${theme.headerRule}, transparent)`,
              }}
            />
            <h1
              style={{
                fontFamily: "Lalezar, Vazirmatn, sans-serif",
                fontSize: meta.title ? 30 : 26,
                lineHeight: 1.2,
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
            <span
              aria-hidden
              style={{
                flex: 1,
                height: 2,
                borderRadius: 999,
                background: `linear-gradient(to right, ${theme.headerRule}, transparent)`,
              }}
            />
          </div>
          {meta.subtitle && (
            <p
              style={{
                fontSize: 12.5,
                color: theme.subtitleText,
                margin: 0,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                textAlign: "center",
                maxWidth: 660,
              }}
            >
              {meta.subtitle}
            </p>
          )}
          {/* همه بج ها یک ردیف — وزن، کمربند، زمین و ساعت همه پیل */}
          <p
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexWrap: "wrap",
              gap: 8,
              margin: "2px 0 0",
              whiteSpace: "nowrap",
              overflow: "hidden",
            }}
          >
            <span style={pill}>
              {renderWeightTitle(meta.sheetTitleFormat, {
                ageCategory: draw.group.ageCategory,
                weightCategory: draw.group.weightCategory,
                tournamentTitle: meta.title,
              })}
            </span>
            {beltLabel && <span style={pill}>کمربند {beltLabel}</span>}
            {matLabel && (
              <span
                style={{
                  ...pill,
                  fontFamily: "Lalezar, Vazirmatn, sans-serif",
                  fontSize: 17,
                  fontWeight: 400,
                  letterSpacing: 0.5,
                  color: theme.matBadgeText,
                  backgroundColor: theme.matBadgeBg,
                  border: `1.5px solid ${theme.matBadgeBg}`,
                  padding: "3px 18px 5.5px",
                }}
              >
                {matLabel}
              </span>
            )}
            {attendTime && (
              <span
                style={{
                  ...pill,
                  fontFamily: "Lalezar, Vazirmatn, sans-serif",
                  fontSize: 17,
                  fontWeight: 400,
                  letterSpacing: 0.5,
                  color: theme.timeBadgeText,
                  backgroundColor: theme.timeBadgeBg,
                  border: `2px solid ${theme.timeBadgeBorder}`,
                  padding: "2px 18px 4.5px",
                }}
              >
                ساعت {toFaDigits(attendTime)}
              </span>
            )}
          </p>
        </div>

        {/* چپ: آمار به شکل سه پیل عمودی */}
        <div
          style={{
            justifySelf: "end",
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "stretch",
            gap: 4,
          }}
        >
          {(
            [
              { label: "شرکت کننده", value: participantCount },
              { label: "مسابقه", value: realMatchCount(draw) },
              { label: "استراحت", value: restCount },
            ] as const
          ).map((stat) => (
            <div
              key={stat.label}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                borderRadius: 999,
                border: `1.5px solid ${theme.statBorder}`,
                backgroundColor: theme.chipBg,
                padding: "2px 12px 3.5px",
                minWidth: 118,
              }}
            >
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 600,
                  color: theme.statLabel,
                  whiteSpace: "nowrap",
                }}
              >
                {stat.label}
              </span>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: theme.titleText,
                  whiteSpace: "nowrap",
                }}
              >
                {toFaDigits(stat.value)}
              </span>
            </div>
          ))}
        </div>
      </header>
    );
  }

  /** سربرگ طرح تشریفاتی — سند قهرمانی: جداکننده الماسی دار بالای عنوان،
   *  بج های مدالی دورخط (کمربند/زمین/ساعت)، لوگوی مدال گرد در لبه و آمار در
   *  یک خط با جداکننده الماسی ریز — تیتر دورها بی کادر می ماند (قانون ثابت)
   *  و همه رنگ ها از همان توکن های تم جدول می آید */
  function renderRoyalHeader() {
    const participantCount = draw.group.participantIds.length;
    const restCount = draw.structure.restSlotIds.length;
    const title = meta.title || "قرعه کشی مسابقات تکواندو";

    // حلقه داخلی بج مدالی — span مطلق است نه outline تا در همه مسیرهای خروجی
    // (چاپ/عکس/PDF) بی کم و کاست رستر شود
    const ring = (color: string, opacity = 0.6) => (
      <span
        aria-hidden
        className="pointer-events-none absolute rounded-full"
        style={{ inset: 2.5, border: `1px solid ${color}`, opacity }}
      />
    );
    const stats = [
      { label: "شرکت کننده", value: participantCount },
      { label: "مسابقه", value: realMatchCount(draw) },
      { label: "استراحت", value: restCount },
    ];

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
          gap: 4,
          padding: `6px ${SHEET_PAD_X + 44}px 8px`,
        }}
      >
        {/* لوگوی مدال گرد — داخل قاب، لبه راست؛ حلقه داخلی با فاصله */}
        {meta.logoDataUrl && (
          <div
            style={{
              position: "absolute",
              insetInlineStart: 26,
              top: "50%",
              transform: "translateY(-50%)",
              width: 66,
              height: 66,
              borderRadius: "50%",
              border: `1.5px solid ${theme.chipBorder}`,
              backgroundColor: theme.chipBg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            {ring(theme.chipBorder, 0.6)}
            <img
              src={meta.logoDataUrl}
              alt=""
              style={{ maxWidth: 48, maxHeight: 48, objectFit: "contain" }}
            />
          </div>
        )}

        {/* جداکننده الماسی دار — خط، لوزی، خط */}
        <div
          aria-hidden
          style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", maxWidth: 560 }}
        >
          <span
            style={{ flex: 1, height: 1.5, background: `linear-gradient(to left, ${theme.headerRule}, transparent)` }}
          />
          <span style={{ width: 8, height: 8, transform: "rotate(45deg)", backgroundColor: theme.headerRule }} />
          <span
            style={{ flex: 1, height: 1.5, background: `linear-gradient(to right, ${theme.headerRule}, transparent)` }}
          />
        </div>

        <h1
          style={{
            fontFamily: "Lalezar, Vazirmatn, sans-serif",
            fontSize: meta.title ? 30 : 26,
            lineHeight: 1.2,
            margin: 0,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            textAlign: "center",
            color: theme.titleText,
            letterSpacing: 1.5,
            maxWidth: "100%",
          }}
        >
          {title}
        </h1>
        {meta.subtitle && (
          <p
            style={{
              fontSize: 12.5,
              color: theme.subtitleText,
              margin: 0,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              textAlign: "center",
              maxWidth: 560,
              letterSpacing: 1,
            }}
          >
            {meta.subtitle}
          </p>
        )}

        {/* ردیف بج های مدالی — عنوان وزن متن اصلی است، بقیه مدال دورخط */}
        <p
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexWrap: "wrap",
            gap: 8,
            margin: 0,
            whiteSpace: "nowrap",
            overflow: "hidden",
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 700, color: theme.titleText, letterSpacing: 1 }}>
            {renderWeightTitle(meta.sheetTitleFormat, {
              ageCategory: draw.group.ageCategory,
              weightCategory: draw.group.weightCategory,
              tournamentTitle: meta.title,
            })}
          </span>
          {beltLabel && (
            <span
              style={{
                position: "relative",
                display: "inline-flex",
                alignItems: "center",
                fontSize: 12,
                fontWeight: 600,
                color: theme.chipText,
                backgroundColor: theme.chipBg,
                border: `1.5px solid ${theme.chipBorder}`,
                borderRadius: 999,
                padding: "3px 14px 4.5px",
                flexShrink: 0,
              }}
            >
              {ring(theme.chipBorder, 0.6)}
              کمربند {beltLabel}
            </span>
          )}
          {matLabel && (
            <span
              style={{
                position: "relative",
                display: "inline-flex",
                alignItems: "center",
                fontFamily: "Lalezar, Vazirmatn, sans-serif",
                fontSize: 16,
                color: theme.matBadgeText,
                backgroundColor: theme.matBadgeBg,
                border: `1.5px solid ${theme.matBadgeBg}`,
                borderRadius: 999,
                padding: "3px 16px 5px",
                letterSpacing: 0.5,
                flexShrink: 0,
              }}
            >
              {ring(theme.matBadgeText, 0.55)}
              {matLabel}
            </span>
          )}
          {attendTime && (
            <span
              style={{
                position: "relative",
                display: "inline-flex",
                alignItems: "center",
                fontFamily: "Lalezar, Vazirmatn, sans-serif",
                fontSize: 16,
                color: theme.timeBadgeText,
                backgroundColor: theme.timeBadgeBg,
                border: `2px solid ${theme.timeBadgeBorder}`,
                borderRadius: 999,
                padding: "2px 16px 4px",
                letterSpacing: 0.5,
                flexShrink: 0,
              }}
            >
              {ring(theme.timeBadgeBorder, 0.55)}
              ساعت {toFaDigits(attendTime)}
            </span>
          )}
        </p>

        {/* آمار در یک خط — جداکننده الماسی ریز بین خانه ها */}
        <p
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            margin: 0,
            fontSize: 11,
            fontWeight: 600,
            color: theme.statLabel,
            letterSpacing: 1,
            whiteSpace: "nowrap",
          }}
        >
          {stats.map((stat, statIndex) => (
            <span key={stat.label} style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
              {statIndex > 0 && (
                <span
                  aria-hidden
                  style={{
                    width: 5,
                    height: 5,
                    transform: "rotate(45deg)",
                    backgroundColor: theme.statDivider,
                    opacity: 0.9,
                  }}
                />
              )}
              {stat.label}
              <b style={{ fontSize: 12.5, color: theme.titleText }}>{toFaDigits(stat.value)}</b>
            </span>
          ))}
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
                strokeWidth={royal ? 3 : 2}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={royal ? "0.1 8" : modern ? "7 5" : undefined}
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
              {/* تیتر دور — در هر دو طرح متن ساده است؛ به درخواست کاربر هیچ
                  کادر و پیلی دور عنوان دورها (یک چهارم/نیمه نهایی/فینال)
                  نمی نشیند و فقط رنگ و فونت از تم می آید */}
              <FitText
                text={roundLabel(column.round, draw.structure.roundCount)}
                baseSize={modern ? 12 : 12.5}
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
                borderRadius: modern || royal ? 999 : 10,
                color: theme.championText,
                fontFamily: "Lalezar, Vazirmatn, sans-serif",
                fontSize: modern || royal ? 20 : 22,
                letterSpacing: modern || royal ? 3 : 1.5,
                border: royal ? `2px solid ${theme.championText}` : undefined,
                gap: royal ? 10 : undefined,
                boxShadow: modern
                  ? `inset 0 0 0 2.5px rgba(255, 255, 255, 0.4), ${theme.championShadow}`
                  : royal
                    ? `inset 0 0 0 2px rgba(255, 255, 255, 0.45), ${theme.championShadow}`
                    : theme.championShadow,
              }}
            >
              {royal ? (
                <>
                  <span
                    aria-hidden
                    style={{
                      display: "inline-block",
                      width: 6,
                      height: 6,
                      backgroundColor: theme.championText,
                      transform: "rotate(45deg)",
                    }}
                  />
                  قهرمان
                  <span
                    aria-hidden
                    style={{
                      display: "inline-block",
                      width: 6,
                      height: 6,
                      backgroundColor: theme.championText,
                      transform: "rotate(45deg)",
                    }}
                  />
                </>
              ) : (
                "قهرمان"
              )}
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
      <ResultsTable
        withBronze={Boolean(draw.structure.bronzeMatch)}
        design={sheetLayout}
      />
    ) : null;
  }

  // ریبون رنگی لبه بالای برگه مدرن — امضای بصری طرح جدید؛ در کلاسیک هیچ است
  const topRibbon = modern ? (
    <div
      aria-hidden
      style={{ height: 6, flexShrink: 0, backgroundColor: theme.matBadgeBg }}
    />
  ) : null;

  const sheetStyle: React.CSSProperties = {
    width: sheetWidth,
    position: "relative",
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
          {topRibbon}
          {royal && <RoyalFrame />}
          {isSolo ? (
            <main
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: royal ? `16px ${SHEET_PAD_X}px` : `0 ${SHEET_PAD_X}px`,
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
                  padding: royal ? `10px ${SHEET_PAD_X}px 22px` : `8px ${SHEET_PAD_X}px 0`,
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
            {topRibbon}
            {royal && <RoyalFrame />}
            {isFirst ? (
              renderHeader()
            ) : (
              <ContinuationHeader
                draw={draw}
                meta={meta}
                note={note}
                page={page}
                total={plans.length}
                design={sheetLayout}
              />
            )}
            <main
              style={{
                flex: 1,
                minHeight: 0,
                padding: royal ? `10px ${SHEET_PAD_X}px 22px` : `8px ${SHEET_PAD_X}px 14px`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
              }}
            >
              {renderBand(layout, dims)}
              {showResults && (
                <ResultsTable
                  withBronze={Boolean(draw.structure.bronzeMatch)}
                  design={sheetLayout}
                />
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
  design = "classic",
}: {
  draw: GroupDraw;
  meta: TournamentMeta;
  note: string;
  page: number;
  total: number;
  design?: SheetLayoutId;
}) {
  const theme = useTableTheme();
  const modern = design === "modern";
  const royal = design === "royal";
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
        borderBottom: royal
          ? `3px double ${theme.contRule}`
          : modern
            ? `2px solid ${theme.headerRule}`
            : `1.5px solid ${theme.contRule}`,
        backgroundColor: modern || royal ? theme.chipBg : undefined,
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
        {royal && (
          <span
            aria-hidden
            style={{
              display: "inline-block",
              width: 5,
              height: 5,
              transform: "rotate(45deg)",
              backgroundColor: theme.headerRule,
            }}
          />
        )}
        {meta.title && <span>{meta.title} —</span>}
        {renderWeightTitle(meta.sheetTitleFormat, {
          ageCategory: draw.group.ageCategory,
          weightCategory: draw.group.weightCategory,
          tournamentTitle: meta.title,
        })}
        <span style={{ fontSize: 10.5, fontWeight: 500, color: theme.contMuted }}>— {note}</span>
      </span>
      {modern || royal ? (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            borderRadius: 999,
            border: `1.5px solid ${theme.chipBorder}`,
            backgroundColor: theme.sheetBg,
            color: theme.chipText,
            fontSize: 10.5,
            fontWeight: 700,
            padding: "2px 12px 3.5px",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          صفحه {toFaDigits(page + 1)} از {toFaDigits(total)}
        </span>
      ) : (
        <span style={{ fontSize: 10.5, color: theme.contMuted, whiteSpace: "nowrap" }}>
          صفحه {toFaDigits(page + 1)} از {toFaDigits(total)}
        </span>
      )}
    </div>
  );
}

/**
 * قاب تشریفاتی دور تمام صفحه — دو خط هم مرکز (بیرونی پهن تر) + چهار نشان
 * الماسی روی گوشه های قاب بیرونی؛ امضای «سند قهرمانی» طرح تشریفاتی. با
 * pointer-events none تا با کشیدن/رها کردن تعاملی تداخل نکند و در همه صفحات
 * (تک برگه و چند صفحه ای) یک جا رستر می شود.
 */
function RoyalFrame() {
  const theme = useTableTheme();
  const diamond = (position: React.CSSProperties) => (
    <span
      aria-hidden
      style={{
        position: "absolute",
        width: 9,
        height: 9,
        transform: "translate(-50%, -50%) rotate(45deg)",
        backgroundColor: theme.headerRule,
        ...position,
      }}
    />
  );
  return (
    <div aria-hidden data-royal-frame style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          inset: 10,
          border: `1.5px solid ${theme.headerRule}`,
          borderRadius: 2,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 15,
          border: `1px solid ${theme.statBorder}`,
          borderRadius: 2,
        }}
      />
      <div data-royal-corners>
        {diamond({ left: 10, top: 10 })}
        {diamond({ left: "calc(100% - 10px)", top: 10 })}
        {diamond({ left: 10, top: "calc(100% - 10px)" })}
        {diamond({ left: "calc(100% - 10px)", top: "calc(100% - 10px)" })}
      </div>
    </div>
  );
}

/**
 * Hand-written final standings at the bottom of the sheet: 1st, 2nd and the
 * two shared 3rd places of a single-elimination draw. Deliberately compact —
 * a small 2×2 card in the middle, leaving the bracket the lion's share of the
 * page. Referees fill the dotted lines with a pen after the matches.
 */
function ResultsTable({
  withBronze,
  design = "classic",
}: {
  withBronze: boolean;
  design?: SheetLayoutId;
}) {
  // باران مدال: مسابقه رده بندی رتبه ها را کامل می کند — ۱ تا ۴ بدون مشترک شدن
  const ranks = withBronze
    ? ["نفر اول", "نفر دوم", "نفر سوم", "نفر چهارم"]
    : ["نفر اول", "نفر دوم", "نفر سوم (مشترک)", "نفر سوم (مشترک)"];
  const theme = useTableTheme();
  const modern = design === "modern";
  const royal = design === "royal";
  const band = modern || royal;
  return (
    <div
      style={{
        width: "100%",
        maxWidth: 420,
        flexShrink: 0,
        border: `1.5px solid ${theme.resultsBorder}`,
        borderRadius: royal ? 8 : modern ? 12 : 10,
        overflow: "hidden",
        backgroundColor: theme.resultsCellBg,
        boxShadow: royal
          ? "0 2px 5px rgba(15, 31, 56, 0.14)"
          : modern
            ? "0 1px 3px rgba(15, 31, 56, 0.1)"
            : undefined,
      }}
    >
      <div
        dir="rtl"
        style={{
          display: "flex",
          alignItems: band ? "center" : "baseline",
          justifyContent: band ? "center" : "space-between",
          flexDirection: band ? "column" : undefined,
          gap: band ? 1 : 10,
          backgroundColor: modern ? theme.matBadgeBg : theme.resultsHeaderBg,
          color: modern ? theme.matBadgeText : theme.resultsHeaderText,
          padding: band ? "5px 12px 7px" : "4px 12px",
        }}
      >
        <span
          style={{
            fontSize: 11.5,
            fontWeight: 700,
            whiteSpace: "nowrap",
            letterSpacing: royal ? 2 : modern ? 1.5 : undefined,
          }}
        >
          نتایج نهایی
        </span>
        <span
          style={{
            fontSize: 8.5,
            color: modern ? theme.matBadgeText : theme.resultsHeaderSub,
            opacity: modern ? 0.85 : undefined,
          }}
        >
          نام و نام خانوادگی ورزشکار را پس از هر مسابقه بنویسید
        </span>
      </div>
      <div
        dir="rtl"
        style={{
          position: "relative",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          backgroundColor: theme.resultsCellBg,
        }}
      >
        {/* دورخط داخلی خانه های نتایج — امضای دوخطه طرح تشریفاتی */}
        {royal && (
          <span
            aria-hidden
            className="pointer-events-none absolute"
            style={{ inset: 2.5, border: `1px solid ${theme.resultsInnerBorder}`, borderRadius: 4 }}
          />
        )}
        {ranks.map((rank, index) => (
          <div
            key={rank + index}
            style={{
              padding: band ? "4px 14px 7px" : "4px 12px 7px",
              textAlign: band ? "center" : undefined,
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
