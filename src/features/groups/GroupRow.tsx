import { ChevronLeft, FileDown, ImageDown, Trash2, UserPlus } from "lucide-react";
import type { GroupDraw, Participant } from "../../core/types.ts";
import { useTournament } from "../../store/tournamentStore.ts";
import { realMatchCount } from "../../lib/drawStats.ts";
import { toFaDigits } from "../../lib/formatFa.ts";

interface GroupRowProps {
  draw: GroupDraw;
  solo?: Participant;
  onOpen: () => void;
  /** گفت وگوی «افزودن هنرجو» به همین وزن — از صفحه گروه ها */
  onAddStudent?: () => void;
}

/**
 * یک کارت فشرده در شبکه وزن های هر رده سنی — همه چیز پشت هم: عنوان وزن و
 * شمارنده ها و دو دکمه عکس/PDF در همان کارت، بدون فاصله خالی بلند. کلیک روی
 * خود کارت جدول را باز می کند و دکمه ها با توقف رویداد سر کارش می مانند.
 */
export function GroupRow({ draw, solo, onOpen, onAddStudent }: GroupRowProps) {
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
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
      className="group relative flex cursor-pointer flex-col gap-2 rounded-xl border border-line bg-surface p-3.5 transition-colors hover:border-mat-400 hover:bg-turf focus-visible:outline focus-visible:outline-2 focus-visible:outline-mat-600"
    >
      <div className="flex items-center gap-2">
        <span className="font-display text-lg leading-7 text-ink-900">
          وزن {toFaDigits(draw.group.weightCategory)}
        </span>
        <span className="flex-1" />
        {(isManual || isMedalRain) && (
          <button
            onClick={(event) => {
              event.stopPropagation();
              const message = isManual
                ? "این جدول دستی با همه خانه هایش حذف شود؟"
                : "این جدول باران مدال با همه خانه هایش حذف شود؟";
              if (window.confirm(message)) {
                if (isManual) removeManualTable(draw.groupId);
                else removeMedalRainTable(draw.groupId);
              }
            }}
            className="flex items-center rounded-lg p-1.5 text-muted transition-colors hover:bg-hogu-100 hover:text-hogu-600"
            title={isManual ? "حذف این جدول دستی" : "حذف این جدول باران مدال"}
          >
            <Trash2 size={14} />
          </button>
        )}
        <ChevronLeft
          size={16}
          className="shrink-0 text-line-strong transition-colors group-hover:text-mat-600"
        />
      </div>
      {solo ? (
        <p className="text-xs leading-5 text-muted">
          تنها شرکت کننده: <span className="font-bold text-ink-800">{solo.fullName}</span> — مربی:{" "}
          {solo.coachName} • بدون مسابقه، صدرنشین خودکار
        </p>
      ) : (
        <p className="text-xs leading-5 text-muted">
          {toFaDigits(participantCount)} نفر • {toFaDigits(realMatchCount(draw))} مسابقه
          {draw.structure.roundCount > 1 && <> • {toFaDigits(draw.structure.roundCount)} دور</>}
        </p>
      )}
      <div className="flex items-center gap-1.5 border-t border-line pt-2">
        {onAddStudent && (
          <button
            onClick={(event) => {
              event.stopPropagation();
              onAddStudent();
            }}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-muted transition-colors hover:bg-mat-50 hover:text-mat-700"
            title="افزودن هنرجوی تازه به این وزن"
          >
            <UserPlus size={13} />
            افزودن هنرجو
          </button>
        )}
        <button
          onClick={(event) => {
            event.stopPropagation();
            exportGroupImage(draw.groupId);
          }}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-muted transition-colors hover:bg-mat-50 hover:text-mat-700"
          title="خروجی عکس PNG این وزن — مناسب ارسال در تلگرام"
        >
          <ImageDown size={13} />
          عکس
        </button>
        <button
          onClick={(event) => {
            event.stopPropagation();
            exportGroupPdf(draw.groupId);
          }}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-muted transition-colors hover:bg-mat-50 hover:text-mat-700"
          title="خروجی PDF این وزن"
        >
          <FileDown size={13} />
          PDF
        </button>
      </div>
    </div>
  );
}
