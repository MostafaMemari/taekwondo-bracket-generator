# قرعه‌کشی مسابقات تکواندو — Taekwondo Draw Board

A fully local (no backend) React + Vite + TypeScript app that turns an Excel roster into
single-elimination brackets per (age category × weight category), with a classic converging
«چپ و راست» draw-sheet layout (final in the centre, round 1 entering from both sides),
manual drag-and-drop correction, editable match numbers, tournament logo/title header and
print-ready A4 output. All UI text is Persian; the layout is RTL.

## Run

```bash
npm install
npm run dev        # start dev server
npm run build      # type-check + production build
npm run preview    # serve the production build
npm run test       # core + end-to-end logic checks (node, no browser)
```

### Standalone single-file build (no server needed)

`taekwondo-bracket.html` is a self-contained build: fonts, sample Excel and all JS/CSS are
inlined, so it runs by double-clicking the file — completely offline, print & PDF included.
Regenerate it with:

```bash
npx vite build --config vite.singlefile.config.ts   # → dist-single/
node ../scripts/make-singlefile.mjs                 # inlines assets into one HTML
```

The sample Excel is embedded at build time via the `virtual:sample-xlsx` plugin
(`vite-plugins/inlineSampleXlsx.ts`), so «امتحان با دادهٔ نمونه» and the template download
work without any server.

`node scripts/make-sample-excel.mjs` regenerates `public/sample-registration.xlsx`.
Open the app with `#pdf-preview` (all sheets) or `#pdf-preview/<groupId>` to inspect the
print sheets on screen — the same pages print directly via «چاپ با پرینتر» (one A4
landscape page per group).

## Features

- **Import**: Excel roster upload with column mapping (saved per browser) + one-click sample data.
- **Groups**: auto grouping by «رده سنی + وزن», per-group PDF export.
- **Draw**: converging bracket (final centred), byes to biggest teams with teammate-clash
  avoidance, same-coach spread, manual swap by drag & drop with undo (Ctrl+Z).
- **Match numbers**: automatic numbering with manual override per match (printed on sheets).
- **Tournament meta**: competition title, subtitle and logo (scaled & stored locally)
  shown in the top bar and on every printed sheet.
- **Output**: jsPDF A4-landscape export (2× scale PNG) and direct browser printing
  (`@page A4 landscape`, one sheet per page).

## Architecture

```
src/
  config/
    excelSchema.ts          Excel column mapping — edit here when columns change
    tournamentRules.ts      swappable rules (bye tie-break, format)
  core/                     pure domain logic, zero React
    types.ts                Participant, CategoryGroup, BracketStructure, GroupDraw...
    excel/parseRosterWorkbook.ts
    grouping/groupByCategory.ts
    bracket/
      buildBracketTree.ts         recursive ceil/floor binary split (depth-based rounds)
      byeStrategy.ts              byes to biggest teams, no teammates in one match
      coachSeparationStrategy.ts  distributeByCoach (spread same-coach athletes)
      generateGroupDraw.ts        orchestration: byes → separation → slots
      applySlotSwap.ts            drag-and-drop swap semantics
      layout.ts                   converging geometry shared by UI canvas and PDF sheet
                                  (fitPrintDims adapts pitch/rows to fit A4)
  store/tournamentStore.ts  zustand + localStorage persistence, undo history,
                            tournament meta + manual match numbers
  features/
    import/   upload, preview table, validation report, sample loader
    groups/   group cards (belt-stripe identity)
    bracket/  dnd-kit canvas, match boxes with winner placeholders, match-number panel
    settings/ title / subtitle / logo modal
    pdf/      print-styled A4 sheets → html2canvas + jsPDF, direct-print preview
```

## Extending

- **New Excel columns**: edit `src/config/excelSchema.ts` only.
- **Different bye rule / tie-break**: replace `resolveByePriorityTie` or `assignByes`
  in `src/core/bracket/byeStrategy.ts`; wire via `src/config/tournamentRules.ts`.
- **Another rule layer** (club, region, seeding): add a strategy module next to
  `coachSeparationStrategy.ts` and compose it in `generateGroupDraw.ts`.
- **Repechage or other formats**: add a module under `src/core/bracket/`; the UI consumes
  `BracketStructure` + `SlotAssignments`, not a specific format.
