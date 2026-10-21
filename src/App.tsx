import { useEffect, useState } from 'react'
import { BracketPage } from './features/bracket/BracketPage.tsx'
import { GroupsPage } from './features/groups/GroupsPage.tsx'
import { ImportPage } from './features/import/ImportPage.tsx'
import { SchedulePage } from './features/schedule/SchedulePage.tsx'
import { SchedulePrintPage } from './features/schedule/SchedulePrintPage.tsx'
import { ExportStage } from './features/pdf/ExportStage.tsx'
import { PrintPreviewPage } from './features/pdf/PrintPreviewPage.tsx'
import { TopBar } from './components/TopBar.tsx'
import { SettingsModal } from './features/settings/SettingsModal.tsx'
import { useTournament } from './store/tournamentStore.ts'

function useHashRoute(): string {
  const [hash, setHash] = useState(window.location.hash)
  useEffect(() => {
    function onChange() {
      setHash(window.location.hash)
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return hash
}

export default function App() {
  const hash = useHashRoute()
  const page = useTournament((state) => state.page)
  const hasData = useTournament((state) => state.participants.length > 0)
  const settingsOpen = useTournament((state) => state.settingsOpen)
  const setSettingsOpen = useTournament((state) => state.setSettingsOpen)

  const isPrintPreview = hash.startsWith('#pdf-preview')
  // «#schedule-print» و «#schedule-print?mode=plan|tables|both»
  const isSchedulePrint = hash.startsWith('#schedule-print')
  // location.hash returns the percent-encoded fragment; group ids contain
  // Persian text, so decode before matching against draw.groupId.
  const rawScope = isPrintPreview ? hash.replace('#pdf-preview', '').replace(/^\//, '') || 'all' : ''
  let printScope = rawScope
  if (rawScope !== 'all') {
    try {
      printScope = decodeURIComponent(rawScope)
    } catch {
      // keep raw scope if it contains stray '%' sequences
    }
  }

  return (
    <div className="min-h-screen bg-paper">
      {!isPrintPreview && !isSchedulePrint && <TopBar />}
      {!hasData || page === 'import' ? (
        <ImportPage />
      ) : isSchedulePrint ? (
        <SchedulePrintPage />
      ) : isPrintPreview ? (
        <PrintPreviewPage scope={printScope} />
      ) : page === 'bracket' ? (
        <BracketPage />
      ) : page === 'schedule' ? (
        <SchedulePage />
      ) : (
        <GroupsPage />
      )}
      <ExportStage />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
