import { BracketPage } from './features/bracket/BracketPage.tsx'
import { GroupsPage } from './features/groups/GroupsPage.tsx'
import { ImportPage } from './features/import/ImportPage.tsx'
import { PdfStage } from './features/pdf/PdfStage.tsx'
import { PrintPreviewPage } from './features/pdf/PrintPreviewPage.tsx'
import { TopBar } from './components/TopBar.tsx'
import { useTournament } from './store/tournamentStore.ts'

export default function App() {
  const page = useTournament((state) => state.page)
  const hasData = useTournament((state) => state.participants.length > 0)
  const isPrintPreview = window.location.hash === '#pdf-preview'

  return (
    <div className="min-h-screen bg-paper">
      {!isPrintPreview && <TopBar />}
      {!hasData ? (
        <ImportPage />
      ) : isPrintPreview ? (
        <PrintPreviewPage />
      ) : page === 'bracket' ? (
        <BracketPage />
      ) : (
        <GroupsPage />
      )}
      <PdfStage />
    </div>
  )
}
