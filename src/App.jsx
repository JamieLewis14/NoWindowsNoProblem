import { useEffect } from 'react'
import useGameStore from './store/useGameStore'
import SetupChecker from './components/SetupChecker'
import GameLibrary from './components/GameLibrary'
import AddGameModal from './components/AddGameModal'
import GameConfigPanel from './components/GameConfigPanel'
import LogViewer from './components/LogViewer'

export default function App() {
  const setupStatus = useGameStore((s) => s.setupStatus)
  const setSetupStatus = useGameStore((s) => s.setSetupStatus)
  const loadGames = useGameStore((s) => s.loadGames)
  const setRunningState = useGameStore((s) => s.setRunningState)
  const appendLog = useGameStore((s) => s.appendLog)
  const showAddModal = useGameStore((s) => s.showAddModal)
  const selectedGameId = useGameStore((s) => s.selectedGameId)
  const showLogViewer = useGameStore((s) => s.showLogViewer)
  const activeView = useGameStore((s) => s.activeView)
  const setActiveView = useGameStore((s) => s.setActiveView)

  useEffect(() => {
    if (!window.api) {
      // Running in browser (not Electron) — show setup checker with mock data
      setSetupStatus({ wine: false, rosetta: false, xquartz: false })
      return
    }

    window.api.checkDependencies().then(setSetupStatus)
    loadGames()

    const removeLogListener = window.api.onLogLine(({ gameId, line, stream }) => {
      appendLog(gameId, line, stream)
    })

    const removeStateListener = window.api.onGameStateChange(({ gameId, state }) => {
      setRunningState(gameId, state)
    })

    return () => {
      removeLogListener()
      removeStateListener()
    }
  }, [])

  const wineReady = setupStatus?.wine === true
  const showSetup = activeView === 'settings' || !wineReady

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100">
      {/* Sidebar */}
      <aside className="w-52 flex-shrink-0 border-r border-gray-800 flex flex-col pt-10">
        <div className="px-5 mb-8">
          <h1 className="text-lg font-bold tracking-tight text-white">NoWindows</h1>
          <p className="text-xs text-gray-500">NoProblem</p>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          <SidebarBtn
            active={activeView === 'library' && wineReady}
            disabled={!wineReady}
            onClick={() => wineReady && setActiveView('library')}
          >
            <LibraryIcon />
            Library
          </SidebarBtn>
          <SidebarBtn
            active={activeView === 'settings'}
            onClick={() => setActiveView('settings')}
          >
            <SettingsIcon />
            Settings
          </SidebarBtn>
        </nav>

        <div className="px-5 pb-5 text-xs text-gray-600">v1.0.0</div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {showSetup ? (
          <SetupChecker
            status={setupStatus}
            onRecheck={async () => {
              const s = await window.api.checkDependencies()
              setSetupStatus(s)
              if (s.wine) setActiveView('library')
            }}
          />
        ) : (
          <GameLibrary />
        )}
      </main>

      {/* Overlays */}
      {showAddModal && <AddGameModal />}
      {selectedGameId && <GameConfigPanel />}
      {showLogViewer && <LogViewer />}
    </div>
  )
}

function SidebarBtn({ children, active, disabled, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        active
          ? 'bg-indigo-500/15 text-indigo-400'
          : disabled
            ? 'text-gray-600 cursor-not-allowed'
            : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
      }`}
    >
      {children}
    </button>
  )
}

function LibraryIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}
