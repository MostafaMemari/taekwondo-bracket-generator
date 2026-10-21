import { ChevronLeft, FileDown, ImageDown, Trash2 } from "lucide-react";
import type { GroupDraw, Participant } from "../../core/types.ts";
import { useTournament } from "../../store/tournamentStore.ts";
import { realMatchCount } from "../../lib/drawStats.ts";
import { toFaDigits } from "../../lib/formatFa.ts";

interface GroupRowProps {
  draw: GroupDraw;
  solo?: Participant;
  onOpen: () => void;
}

/**
 * یک ردیف فشرده در فهرست وزن های هر رده سنی — کل ردیف برای بازکردن جدول
 * کلیک پذیر است و دو دکمه کوچک خروجی عکس/PDF در انتهای آن نشسته اند.
 */
export function GroupRow({ draw, solo, onOpen }: GroupRowProps) {
  const exportGroupPdf = useTournament((state) => state.exportGroupPdf);
  const exportGroupImage = useTournament((state) => state.exportGroupImage);
  const removeManualTable = useTournament((state) => state.removeManualTable);
  const removeMedalRainTable = useTournament((state) => state.removeMedalRainTable);
  const manualTables = useTournament((state) => state.manualTables);
  const medalRainTables = useTournament((state) => state.medalRainTables);
  const isManual = Boolean(manualTables[draw.groupId]);
  const isMedalRain = Boolean(medalRainTables[draw.groupId]);
  const participantCount = solo ? 1 : draw.group.participantIds.length;

  return (
    <div className="group relative flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-turf">
      <button onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 text-right">
        <span className="shrink-0 font-display text-lg leading-7 text-ink-900">
          وزن {toFaDigits(draw.group.weightCategory)}
        </span>
        {solo ? (
          <span className="text-xs leading-5 text-muted">
            تنها شرکت کننده: <span className="font-bold text-ink-800">{solo.fullName}</span> — مربی:{" "}
            {solo.coachName} • بدون مسابقه، صدرنشین خودکار
          </span>
        ) : (
          <span className="truncate text-xs text-muted">
            {toFaDigits(participantCount)} نفر •{" "}
            {toFaDigits(realMatchCount(draw))} مسابقه
            {draw.structure.roundCount > 1 && <> • {toFaDigits(draw.structure.roundCount)} دور</>}
          </span>
        )}
      </button>
      <div className="flex shrink-0 items-center gap-0.5">
        {(isManual || isMedalRain) && (
          <button
            onClick={() => {
              const message = isManual
                ? "این جدول دستی با همه خانه هایش حذف شود؟"
                : "این جدول باران مدال با همه خانه هایش حذف شود؟";
              if (window.confirm(message)) {
                if (isManual) removeManualTable(draw.groupId);
                else removeMedalRainTable(draw.groupId);
              }
            }}
            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-hogu-100 hover:text-hogu-600"
            title={isManual ? "حذف این جدول دستی" : "حذف این جدول باران مدال"}
          >
            <Trash2 size={14} />
          </button>
        )}
        <button
          onClick={() => exportGroupImage(draw.groupId)}
          className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-mat-50 hover:text-mat-700"
          title="خروجی عکس PNG این وزن — مناسب ارسال در تلگرام"
        >
          <ImageDown size={14} />
          <span className="hidden sm:inline">عکس</span>
        </button>
        <button
          onClick={() => exportGroupPdf(draw.groupId)}
          className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-mat-50 hover:text-mat-700"
          title="خروجی PDF این وزن"
        >
          <FileDown size={14} />
          <span className="hidden sm:inline">PDF</span>
        </button>
      </div>
      <ChevronLeft
        size={16}
        className="shrink-0 text-line-strong transition-colors group-hover:text-mat-600"
      />
    </div>
  );
}
