# تخته قرعه کیوروگی — Taekwondo Bracket Generator

A fully local (no backend) React + Vite + TypeScript app that turns an Excel roster into
single-elimination brackets per (age category × weight category), with manual drag-and-drop
correction and print-ready PDF export. All UI text is Persian; the layout is RTL.

## Run

```bash
npm install
npm run dev        # start dev server
npm run build      # type-check + production build
npm run preview    # serve the production build
npm run test       # core + end-to-end logic checks (node, no browser)
```

`node scripts/make-sample-excel.mjs` regenerates `public/sample-registration.xlsx`.
Open the app with `#pdf-preview` to inspect all print sheets on screen.

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
      buildBracketTree.ts         recursive ceil/floor binary split
      byeStrategy.ts              assignByes (+ resolveByePriorityTie hook)
      coachSeparationStrategy.ts  distributeByCoach (spread same-coach athletes)
      generateGroupDraw.ts        orchestration: byes → separation → slots
      applySlotSwap.ts            drag-and-drop swap semantics
      layout.ts                   pure geometry shared by UI canvas and PDF sheet
  store/tournamentStore.ts  zustand + localStorage persistence, undo history
  features/
    import/   upload, preview table, validation report
    groups/   group cards (belt-stripe identity)
    bracket/  dnd-kit canvas with connectors, undo, reset
    pdf/      print-styled sheets → html2canvas + jsPDF
```

## Extending

- **New Excel columns**: edit `src/config/excelSchema.ts` only.
- **Different bye rule / tie-break**: replace `resolveByePriorityTie` or `assignByes`
  in `src/core/bracket/byeStrategy.ts`; wire via `src/config/tournamentRules.ts`.
- **Another rule layer** (club, region, seeding): add a strategy module next to
  `coachSeparationStrategy.ts` and compose it in `generateGroupDraw.ts`.
- **Repechage or other formats**: add a module under `src/core/bracket/`; the UI consumes
  `BracketStructure` + `SlotAssignments`, not a specific format.
