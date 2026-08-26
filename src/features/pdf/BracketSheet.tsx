import { Swords, Trophy } from "lucide-react";
import { computeBracketLayout, printLayoutDims } from "../../core/bracket/layout.ts";
import type { GroupDraw, Participant, SlotOccupant } from "../../core/types.ts";
import { beltColorFor } from "../../lib/beltColor.ts";
import { groupTitle, toFaDigits } from "../../lib/formatFa.ts";
import { findSoloParticipant } from "../../lib/soloDraw.ts";
import { matchLabel, roundLabel } from "../../lib/roundLabels.ts";

export const sheetWidth = 1120;

interface BracketSheetProps {
  draw: GroupDraw;
  participantsById: Map<string, Participant>;
  index: number;
  total: number;
  dateText: string;
  sourceName: string;
}

export function BracketSheet({ draw, participantsById, index, total, dateText, sourceName }: BracketSheetProps) {
  const layout = computeBracketLayout(draw.structure, printLayoutDims);
  const bodyWidth = sheetWidth - 56 * 2;
  const scale = Math.min(1, bodyWidth / layout.width);
  const belt = beltColorFor(draw.groupId);

  const participantCount = draw.structure.leaves.length;
  const byeCount = draw.structure.byeSlotIds.length;

  function renderSlot(slotId: string) {
    return <SheetSlotContent occupant={draw.assignments[slotId]} participantsById={participantsById} />;
  }

  return (
    <div
      id={`pdf-sheet-${index}`}
      dir="rtl"
      className="relative overflow-hidden"
      style={{ width: sheetWidth, backgroundColor: "#ffffff", color: "#101d31" }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          insetBlock: 0,
          insetInlineStart: 0,
          width: 10,
          backgroundColor: belt.hex,
          borderInlineEnd: belt.needsBorder ? "1px solid #d8dfea" : undefined,
        }}
      />

      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "28px 40px 18px",
          borderBottom: "2px solid #101d31",
          marginInlineStart: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 78,
              height: 78,
              borderRadius: "50%",
              border: "2px solid #101d31",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              flexShrink: 0,
            }}
          >
            <Swords size={26} color="#101d31" />
            <span style={{ fontSize: 11, fontWeight: 700 }}>کیوروگی</span>
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 500, color: "#5b6b82", margin: 0 }}>برگهٔ قرعه‌کشی مسابقات — نظام حذفی تک‌حذفی</p>
            <h1
              style={{
                fontFamily: "Lalezar, Vazirmatn, sans-serif",
                fontSize: 34,
                lineHeight: 1.2,
                margin: "4px 0 6px",
              }}
            >
              {groupTitle(draw.group.ageCategory, draw.group.weightCategory)}
            </h1>
            <p style={{ fontSize: 12, color: "#5b6b82", margin: 0 }}>
              {dateText} • فایل: {sourceName}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", border: "1px solid #b9c5d6", borderRadius: 8 }}>
          <StatCell label="شرکت‌کننده" value={toFaDigits(participantCount)} />
          <StatCell label="مسابقه" value={toFaDigits(participantCount - 1)} divider />
          <StatCell label="استراحت" value={toFaDigits(byeCount)} divider />
        </div>
      </header>

      <main style={{ padding: "16px 40px 8px", marginInlineStart: 10 }}>
        {draw.structure.roundCount === 0 ? (
          <SoloWinnerStatement solo={findSoloParticipant(draw, participantsById)} />
        ) : (
          <div style={{ width: bodyWidth, height: layout.height * scale }}>
            <div
              dir="ltr"
              style={{
                position: "relative",
                width: layout.width,
                height: layout.height,
                transform: `scale(${scale})`,
                transformOrigin: "top right",
              }}
            >
              <svg width={layout.width} height={layout.height} style={{ position: "absolute", inset: 0 }}>
                {layout.connectors.map((points, connectorIndex) => (
                  <polyline
                    key={connectorIndex}
                    points={points.map((point) => `${point.x},${point.y}`).join(" ")}
                    fill="none"
                    stroke="#46608a"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}
              </svg>

              {layout.columns.map((column) => (
                <div
                  key={column.round}
                  dir="rtl"
                  style={{
                    position: "absolute",
                    left: column.x,
                    top: 24,
                    fontSize: 15,
                    fontWeight: 700,
                    color: "#27405f",
                    whiteSpace: "nowrap",
                    transform: "translateX(-50%)",
                  }}
                >
                  {roundLabel(column.round, draw.structure.roundCount)}
                </div>
              ))}

              {layout.matches.map((match) => (
                <div
                  key={match.matchId}
                  style={{ position: "absolute", left: match.x, top: match.y, width: match.width, height: match.height }}
                >
                  <SheetMatchBox match={match} roundCount={draw.structure.roundCount} renderSlot={renderSlot} />
                </div>
              ))}

              {layout.cards.map((card) =>
                card.kind === "bye-marker" ? (
                  <div
                    key={`bye-${card.slotId}`}
                    dir="rtl"
                    style={{
                      position: "absolute",
                      left: card.x,
                      top: card.y,
                      width: printLayoutDims.cardWidth,
                      height: printLayoutDims.cardHeight,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "2px dashed #b9c5d6",
                      borderRadius: 8,
                      backgroundColor: "#f6f8fb",
                      color: "#5b6b82",
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    استراحت
                  </div>
                ) : (
                  <div
                    key={card.slotId}
                    style={{
                      position: "absolute",
                      left: card.x,
                      top: card.y,
                      width: printLayoutDims.cardWidth,
                      height: printLayoutDims.cardHeight,
                    }}
                  >
                    {renderSlot(card.slotId)}
                  </div>
                ),
              )}
            </div>
          </div>
        )}
      </main>

      <footer
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginInlineStart: 10,
          borderTop: "1px solid #d8dfea",
          padding: "12px 40px 20px",
          fontSize: 12,
          color: "#5b6b82",
        }}
      >
        <span>
          گروه {toFaDigits(index + 1)} از {toFaDigits(total)}
        </span>
        <span>تولیدشده با تخته قرعه کیوروگی</span>
      </footer>
    </div>
  );
}

function SoloWinnerStatement({ solo }: { solo: Participant | null }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
        padding: "42px 0",
      }}
    >
      <span
        style={{
          width: 58,
          height: 58,
          borderRadius: "50%",
          backgroundColor: "#fdf7e7",
          border: "2px solid #c9971c",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Trophy size={26} color="#a87b12" />
      </span>
      {solo ? (
        <>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: "#5b6b82" }}>تنها شرکت‌کنندهٔ این دستهٔ وزنی</p>
          <p style={{ margin: 0, fontFamily: "Lalezar, Vazirmatn, sans-serif", fontSize: 32, lineHeight: 1.25, color: "#101d31" }}>
            {solo.fullName}
          </p>
          <p style={{ margin: 0, fontSize: 13.5, color: "#5b6b82" }}>مربی: {solo.coachName}</p>
        </>
      ) : (
        <p style={{ margin: 0, fontSize: 14, color: "#5b6b82" }}>این گروه بدون شرکت‌کننده است.</p>
      )}
      <p
        style={{
          margin: "10px 0 0",
          maxWidth: 660,
          fontSize: 13.5,
          lineHeight: 1.9,
          textAlign: "center",
          backgroundColor: "#fdf7e7",
          border: "1px solid #e3cf9a",
          borderRadius: 8,
          padding: "10px 20px",
          color: "#27405f",
        }}
      >
        تنها شرکت‌کنندهٔ این دستهٔ وزنی همین یک نفر است؛ بدون برگزاری مسابقه، به‌طور خودکار در رتبهٔ نخست این وزن قرار می‌گیرد.
      </p>
    </div>
  );
}

function StatCell({ label, value, divider }: { label: string; value: string; divider?: boolean }) {
  return (
    <div
      style={{
        padding: "10px 18px",
        textAlign: "center",
        borderInlineStart: divider ? "1px solid #d8dfea" : undefined,
      }}
    >
      <p style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{value}</p>
      <p style={{ margin: 0, fontSize: 11, color: "#5b6b82" }}>{label}</p>
    </div>
  );
}

function SheetSlotContent({ occupant, participantsById }: { occupant: SlotOccupant; participantsById: Map<string, Participant> }) {
  if (occupant.kind === "bye") {
    return (
      <div
        dir="rtl"
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          border: "2px dashed #b9c5d6",
          borderRadius: 8,
          backgroundColor: "#f6f8fb",
          color: "#5b6b82",
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 700 }}>استراحت</span>
        <span style={{ fontSize: 11 }}></span>
      </div>
    );
  }

  const participant = participantsById.get(occupant.participantId);
  return (
    <div
      dir="rtl"
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 3,
        border: "1.5px solid #b9c5d6",
        borderRadius: 8,
        backgroundColor: "#ffffff",
        padding: "0 14px",
      }}
    >
      <span style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.35 }}>{participant?.fullName ?? "—"}</span>
      <span style={{ fontSize: 11.5, color: "#5b6b82" }}>مربی: {participant?.coachName ?? "—"}</span>
    </div>
  );
}

function SheetMatchBox({
  match,
  roundCount,
  renderSlot,
}: {
  match: ReturnType<typeof computeBracketLayout>["matches"][number];
  roundCount: number;
  renderSlot: (slotId: string) => React.ReactNode;
}) {
  const isFinal = match.round === roundCount;
  const borderColor = isFinal ? "#c9971c" : "#b9c5d6";

  if (match.topSlotId) {
    return (
      <div
        dir="rtl"
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          border: `2px solid ${borderColor}`,
          borderRadius: 8,
          backgroundColor: "#ffffff",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: printLayoutDims.matchHeaderHeight,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderBottom: `1px solid ${isFinal ? "#c9971c" : "#d8dfea"}`,
            backgroundColor: isFinal ? "#fdf7e7" : "#f6f8fb",
            fontSize: 13,
            fontWeight: 700,
            color: isFinal ? "#a87b12" : "#1a2c47",
            flexShrink: 0,
          }}
        >
          {matchLabel(match.matchNumber)}
        </div>
        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateRows: "1fr 1fr",
            gap: printLayoutDims.matchInnerGap,
            padding: 8,
          }}
        >
          {renderSlot(match.topSlotId)}
          {renderSlot(match.bottomSlotId!)}
        </div>
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        border: `2px solid ${borderColor}`,
        borderRadius: 8,
        backgroundColor: isFinal ? "#fdf7e7" : "#f6f8fb",
      }}
    >
      <span style={{ fontSize: 13, fontWeight: 700, color: isFinal ? "#a87b12" : "#1a2c47" }}>{matchLabel(match.matchNumber)}</span>
      <span style={{ fontSize: 11, color: "#5b6b82" }}>{roundLabel(match.round, roundCount)}</span>
    </div>
  );
}
