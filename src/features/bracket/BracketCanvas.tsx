import { useEffect, useMemo, useRef, useState } from "react";
import { Pencil } from "lucide-react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import {
  barSideForMatch,
  computeBracketLayout,
  interactiveLayoutDims,
  matchIsPlayed,
  type SlotSide,
} from "../../core/bracket/layout.ts";
import type { GroupDraw, Participant } from "../../core/types.ts";
import type { LayoutMatch, PlanLeaf } from "../../core/bracket/layout.ts";
import { useTournament } from "../../store/tournamentStore.ts";
import { toFaDigits } from "../../lib/formatFa.ts";
import {
  matchChipFactor,
  matchChipPalette,
  matchChipRadius,
} from "../../lib/matchChipStyles.ts";
import { classicTheme } from "../../lib/tableThemes.ts";
import { roundLabel } from "../../lib/roundLabels.ts";
import { FitText } from "../../components/FitText.tsx";
import { MatchBox } from "./MatchBox.tsx";
import { SlotCard } from "./SlotCard.tsx";
import { PositionRow, WinnerRow } from "./SlotRows.tsx";
import {
  matchNumberTooltip,
  useMatchNumberField,
} from "./matchNumberField.ts";

const dims = interactiveLayoutDims;

export function BracketCanvas({
  draw,
  matchNumbers,
}: {
  draw: GroupDraw;
  /** شماره نمایشی هر مسابقه — کلید «groupId/matchId» (برنامه زنده + شماره های دستی) */
  matchNumbers?: Map<string, string>;
}) {
  const participants = useTournament((state) => state.participants);
  const moveParticipant = useTournament((state) => state.moveParticipant);
  const manualTables = useTournament((state) => state.manualTables);
  const updateParticipant = useTournament((state) => state.updateParticipant);
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);
  // کشیدن گوشه «استراحت» — روکش شبح استراحت به جای کارت هنرجو رندر می شود
  const [activeIsRest, setActiveIsRest] = useState(false);
  // جدول دستی: خانه در حال ویرایش + نگهبان «تازه کشیده شد» تا رها کردن کارت
  // بی دلیل ویرایشگر را باز نکند (کلیک بعد از درگ رویداد click هم می گذارد)
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const dragJustEnded = useRef(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const manualInfo = manualTables[draw.groupId];
  const isManual = Boolean(manualInfo);

  // open on the finale: the page is RTL, so the browser parks the scroll at
  // the right end — centre the final instead, it is the focal point
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const overflow = el.scrollWidth - el.clientWidth;
    if (overflow <= 0) return;
    const isRtl = getComputedStyle(el).direction === "rtl";
    el.scrollLeft = isRtl ? -overflow / 2 : overflow / 2;
  }, [draw.groupId]);

  // tall sheets (۳۲ و ۶۴ نفره): the canvas flows into the page itself, so
  // vertical focusing needs a window scroll — the first look should land on
  // the final, not on the empty middle-top of a huge sheet. The little delay
  // lets the web fonts settle so the header height is final before measuring.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const timer = window.setTimeout(() => {
      if (el.scrollHeight > el.clientHeight + 1) return;
      if (el.offsetHeight <= window.innerHeight) return;
      // document-absolute top (offsetTop is relative to the offsetParent)
      const docTop = el.getBoundingClientRect().top + window.scrollY;
      const target = docTop + el.offsetHeight / 2 - window.innerHeight / 2;
      if (target > 0) window.scrollTo({ top: target });
    }, 150);
    return () => window.clearTimeout(timer);
  }, [draw.groupId]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const participantsById = useMemo(() => {
    const byId = new Map<string, Participant>();
    for (const participant of participants) byId.set(participant.id, participant);
    return byId;
  }, [participants]);

  // پلاک «قهرمان» زیر فینال — از تنظیمات فعال/غیرفعال می شود
  const showChampion = useTournament((state) => state.showChampion);

  const layout = useMemo(
    () => computeBracketLayout(draw.structure, dims, { showChampion }),
    [draw.structure, showChampion],
  );

  function slotIdFrom(event: DragStartEvent | DragEndEvent): string | undefined {
    const data = event.active.data.current as { slotId?: string } | undefined;
    return data?.slotId;
  }

  function isRestFrom(event: DragStartEvent | DragEndEvent): boolean {
    const data = event.active.data.current as { isRest?: boolean } | undefined;
    return data?.isRest === true;
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveSlotId(null);
    setActiveIsRest(false);
    dragJustEnded.current = true;
    window.setTimeout(() => {
      dragJustEnded.current = false;
    }, 250);
    const fromSlotId = slotIdFrom(event);
    // هر دو طرف شناسه اسلات خودشان را می فرستند — رها کردن استراحت روی هر
    // هنرجو (یا برعکس) دو خانه را کامل عوض می کند؛ استراحت همان جا می نشیند
    // و ساختار جدول دست نمی خورد (شماره ها اوکی می مانند)
    const overData = event.over?.data.current as { slotId?: string } | undefined;
    const toSlotId =
      overData?.slotId ?? (typeof event.over?.id === "string" ? event.over.id : undefined);
    if (typeof fromSlotId === "string" && typeof toSlotId === "string" && fromSlotId !== toSlotId) {
      moveParticipant(draw.groupId, fromSlotId, toSlotId);
    }
  }

  function startManualEdit(slotId: string) {
    if (!isManual || dragJustEnded.current) return;
    setEditingSlotId(slotId);
  }

  function renderSlot(
    slotId: string,
    side: SlotSide,
    barSide?: "left" | "right",
  ) {
    const occupant = draw.assignments[slotId];
    const participant =
      occupant.kind === "participant" ? participantsById.get(occupant.participantId) : undefined;
    return (
      <SlotCard
        slotId={slotId}
        occupant={occupant}
        participant={participant}
        side={side}
        nameFontSize={dims.nameFontSize}
        coachFontSize={dims.subFontSize}
        showCoach={dims.showCoach}
        barSide={barSide}
        manualEdit={
          isManual && participant
            ? {
                editing: editingSlotId === slotId,
                onStart: () => startManualEdit(slotId),
                onSave: (patch) => {
                  updateParticipant(participant.id, patch);
                  setEditingSlotId(null);
                },
                onEnd: () => setEditingSlotId(null),
              }
            : undefined
        }
      />
    );
  }

  /** برگ های بوم همیشه اسلات واقعی اند — جایگاه «برنده مسابقه» فقط روی برگه چاپ می آید */
  function renderLeaf(leaf: PlanLeaf | null, side: SlotSide, match?: LayoutMatch) {
    // نوار رنگی سمت بیرونی نیمه مربوطه می نشیند — برگه آینه ای
    const barSide = match ? barSideForMatch(match, layout.width) : undefined;
    if (leaf?.kind === "winner") {
      return <WinnerRow matchNumber={leaf.matchNumber} side={side} barSide={barSide} />;
    }
    if (leaf?.kind !== "slot") {
      return <PositionRow side={side} />;
    }
    // خانه «استراحت» خودش قابل کشیدن است و هر خانه ای هم پذیرای رها کردن —
    // فقط دو خانه جابه جا می شوند؛ ساختار دست نمی خورد و شماره ها ثابت می مانند
    return renderSlot(leaf.slotId, side, barSide);
  }

  const activeOccupant = activeSlotId ? draw.assignments[activeSlotId] : undefined;
  const activeParticipant = activeOccupant?.kind === "participant" ? participantsById.get(activeOccupant.participantId) : undefined;
  // اندازه بج شماره از تنظیمات — ضریب روی اندازه پایه چیدمان
  const matchChipSize = useTournament((state) => state.matchChipSize);
  const chipSize = Math.round(dims.chipSize * matchChipFactor(matchChipSize));

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={(event) => {
        setActiveSlotId(slotIdFrom(event) ?? null);
        setActiveIsRest(isRestFrom(event));
      }}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setActiveSlotId(null);
        setActiveIsRest(false);
      }}
    >
      <div ref={scrollRef} className="overflow-auto rounded-xl border border-line bg-white">
        <div
          dir="ltr"
          className="relative mx-auto"
          style={{
            width: layout.width,
            height: layout.height,
          }}
        >
          <svg width={layout.width} height={layout.height} className="absolute inset-0">
            {layout.connectors.map((points, index) => (
              <polyline
                key={index}
                points={points.map((point) => `${point.x},${point.y}`).join(" ")}
                fill="none"
                stroke="#94a3b8"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
          </svg>

          {layout.columns.map((column, index) => (
            <div
              key={`${column.round}-${index}`}
              dir="rtl"
              className="absolute -translate-x-1/2 whitespace-nowrap font-display text-sm text-ink-500"
              style={{ left: column.x, top: 30 }}
            >
              {roundLabel(column.round, draw.structure.roundCount)}
            </div>
          ))}

          {layout.matches.map((match) => (
            <div
              key={match.matchId}
              className="absolute transition-[left,top] duration-300"
              style={{ left: match.x, top: match.y, width: match.width, height: match.height }}
            >
              <MatchBox
                match={match}
                roundCount={draw.structure.roundCount}
                dims={dims}
                renderLeaf={renderLeaf}
              />
            </div>
          ))}

          {layout.champion && (
            <div
              dir="rtl"
              className="absolute flex items-center justify-center rounded-xl font-display"
              style={{
                left: layout.champion.x,
                top: layout.champion.y,
                width: layout.champion.width,
                height: layout.champion.height,
                background: "linear-gradient(135deg, #fbbf24, #d97706)",
                color: "#ffffff",
                fontSize: 19,
                letterSpacing: 1,
                boxShadow: "0 2px 8px rgba(180, 83, 9, 0.35)",
              }}
            >
              قهرمان
            </div>
          )}

          {layout.matches
            .filter((match) => matchIsPlayed(match, draw.assignments))
            .map((match) => (
              <MatchNumberChip
                key={`chip-${match.matchId}`}
                groupId={draw.groupId}
                matchId={match.matchId}
                isFinal={match.round === draw.structure.roundCount}
                autoText={matchNumbers?.get(`${draw.groupId}/${match.matchId}`)}
                chipX={match.chipX}
                chipY={match.chipY}
                size={chipSize}
              />
            ))}
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeIsRest ? (
          // شبح استراحت — همان نمای خانه استراحت با سایه بلندتر
          <div
            dir="rtl"
            className="flex h-16 w-[216px] items-center justify-center rounded-md border-2 border-dashed shadow-lg"
            style={{
              borderColor: classicTheme.sides.chong.borderSoft,
              backgroundColor: classicTheme.byeBg,
            }}
          >
            <span
              className="text-[11px] font-bold"
              style={{ color: classicTheme.sides.chong.accent, opacity: 0.6 }}
            >
              استراحت
            </span>
          </div>
        ) : activeParticipant ? (
          <div
            dir="rtl"
            className="flex w-[216px] items-stretch overflow-hidden rounded-md shadow-lg"
            style={{ backgroundColor: "#f1f5f9" }}
          >
            <span aria-hidden className="w-1 shrink-0" style={{ backgroundColor: "#64748b" }} />
            <div className="flex min-w-0 flex-1 flex-col justify-center px-2.5 py-1.5">
              <FitText
                text={activeParticipant.fullName}
                baseSize={15}
                minSize={9}
                align="center"
                className="font-bold leading-tight text-ink-900"
              />
              <FitText
                text={activeParticipant.coachName}
                baseSize={11.5}
                minSize={8}
                align="center"
                className="font-medium leading-tight text-ink-700"
              />
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

/**
 * The match-number circle, drawn as a tiny in-place input. When the mat plan
 * (برنامه ریزی زمین ها) numbers the match, the circle shows that number right
 * away; a hand-typed number always wins over the plan. Filled circles turn
 * into solid badges and every keystroke is persisted to localStorage with the
 * rest of the draw.
 *
 * UX details: a pencil glyph fades in on hover so the empty circle reads as
 * editable, the halo ring is painted through the inline box-shadow (a Tailwind
 * ring would be overridden by the filled badge shadow), Enter commits and
 * Escape clears, and mobile keyboards open in numeric mode.
 * نوشتن/پاک کردن، رنگ و راهنما از «matchNumberField» مشترک می آید — همان
 * منبع چipt برگه های چاپ و بج فهرست برنامه؛ نمایش همیشه رقم فارسی است.
 */
function MatchNumberChip({
  groupId,
  matchId,
  isFinal,
  autoText,
  chipX,
  chipY,
  size,
}: {
  groupId: string;
  matchId: string;
  isFinal: boolean;
  /** شماره زنده برنامه — وقتی شماره دستی نباشد نمایش داده می شود */
  autoText?: string;
  chipX: number;
  chipY: number;
  size: number;
}) {
  const { override, focused, setFocused, setValue, onKeyDown } = useMatchNumberField(
    groupId,
    matchId,
  );
  const rawValue = override || autoText || "";
  // نمایش رقم فارسی — در حین تایپ همان که کاربر می نویسد دیده می شود
  const value = focused ? override : toFaDigits(rawValue);
  const filled = rawValue.length > 0;
  // رنگ و شکل بج از تنظیمات ظاهر شماره — بوم خارج از برگه است، رنگ همراه تم همان کلاسیک است
  const chipStyle = useTournament((state) => state.matchChipStyle);
  const palette = matchChipPalette(chipStyle, classicTheme, isFinal);
  const tooltip = matchNumberTooltip({ override, planText: autoText });

  return (
    <div
      className="group absolute z-10"
      style={{ left: chipX - size / 2, top: chipY - size / 2, width: size, height: size }}
    >
      {!filled && !focused && (
        <Pencil
          aria-hidden
          size={Math.round(size * 0.44)}
          className="pointer-events-none absolute inset-0 m-auto opacity-0 transition-opacity duration-150 group-hover:opacity-60"
          style={{ color: palette.accent }}
        />
      )}
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
        className="absolute inset-0 text-center font-bold outline-none transition-[background-color,border-color,transform,box-shadow] duration-150 hover:scale-110"
        style={{
          padding: 0,
          borderRadius: matchChipRadius(chipStyle.shape, size),
          fontSize: Math.round(size * 0.48),
          lineHeight: 1,
          caretColor: palette.accent,
          color: filled
            ? chipStyle.fill === "solid"
              ? palette.filledText
              : palette.accent
            : "#94a3b8",
          ...(filled
            ? {
                cursor: "default",
                border: `2px solid ${palette.accent}`,
                backgroundColor:
                  chipStyle.fill === "solid" ? palette.accent : palette.outlineBg,
                boxShadow: focused
                  ? `0 0 0 3px ${palette.halo}, 0 1px 3px rgba(15, 31, 56, 0.35)`
                  : "0 1px 3px rgba(15, 31, 56, 0.35)",
              }
            : {
                cursor: "text",
                border: `2px dashed ${focused ? palette.accent : "#cbd5e1"}`,
                backgroundColor: focused ? palette.focusBg : "#ffffff",
                boxShadow: focused ? `0 0 0 3px ${palette.halo}` : undefined,
              }),
        }}
      />
    </div>
  );
}
