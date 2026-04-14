import { useState, useEffect } from 'react'
import useGameStore from '../store/useGameStore'

export default function GameCard({ game }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [exeMissing, setExeMissing] = useState(false)

  const runningState = useGameStore((s) => s.runningGames[game.id])
  const removeGame = useGameStore((s) => s.removeGame)
  const setSelectedGameId = useGameStore((s) => s.setSelectedGameId)
  const openLogViewer = useGameStore((s) => s.openLogViewer)
  const showToast = useGameStore((s) => s.showToast)
  const setRunningState = useGameStore((s) => s.setRunningState)

  const isRunning = runningState === 'running'
  const isInit = runningState === 'initialising'
  const isError = runningState === 'error'
  const isBusy = isRunning || isInit

  // Check if exe exists (only when idle/error, not while running)
  useEffect(() => {
    if (!window.api || isBusy) return
    // We can't do fs.access from renderer, so we attempt to validate via a simple heuristic
    // The real check happens in wineManager.launchGame on the main process side
    setExeMissing(false)
  }, [game.exePath, isBusy])

  const handlePlay = async () => {
    if (isRunning) {
      await window.api.killGame(game.id)
      return
    }
    if (isInit) return // Don't interrupt init

    // Clear previous error state before launch
    if (isError) {
      setRunningState(game.id, 'stopped')
    }

    try {
      await window.api.launchGame(game)
    } catch (err) {
      const msg = err.message || String(err)
      if (msg.includes('not found')) {
        setExeMissing(true)
        showToast(`Executable not found at ${game.exePath}. Please reconfigure this game.`)
      } else {
        showToast(msg)
      }
      openLogViewer(game.id)
    }
  }

  const handleDelete = async (deleteBottle) => {
    if (deleteBottle && window.api) {
      await window.api.resetBottle(game)
    }
    await removeGame(game.id)
    setConfirmDelete(false)
    setMenuOpen(false)
  }

  const handleResetBottle = async () => {
    if (window.api) await window.api.resetBottle(game)
    setRunningState(game.id, 'stopped')
    setConfirmReset(false)
    setMenuOpen(false)
  }

  return (
    <div className="group relative rounded-xl bg-gray-900 border border-gray-800 overflow-hidden hover:border-gray-700 transition-colors">
      {/* Cover art */}
      <div className="aspect-[3/4] bg-gray-800 flex items-center justify-center relative overflow-hidden">
        {game.iconPath ? (
          <img
            src={`file://${game.iconPath}`}
            alt={game.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-4xl font-bold text-gray-600 select-none">
            {game.name.charAt(0).toUpperCase()}
          </span>
        )}

        {/* Status badges */}
        {isRunning && (
          <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-500/20 backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[10px] text-green-300 font-medium">Running</span>
          </div>
        )}
        {isInit && (
          <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-1 rounded-full bg-yellow-500/20 backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
            <span className="text-[10px] text-yellow-300 font-medium">Setting up...</span>
          </div>
        )}
        {isError && (
          <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-1 rounded-full bg-orange-500/20 backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
            <span className="text-[10px] text-orange-300 font-medium">Last run failed</span>
          </div>
        )}
        {exeMissing && (
          <div className="absolute top-2 left-2 px-2 py-1 rounded-full bg-red-500/20 backdrop-blur-sm">
            <span className="text-[10px] text-red-300 font-medium">EXE not found</span>
          </div>
        )}

        {/* Play/Stop overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          {isInit ? (
            <div className="w-12 h-12 rounded-full bg-gray-700/80 flex items-center justify-center">
              <svg className="w-5 h-5 text-yellow-300 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : (
            <button
              onClick={handlePlay}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-transform hover:scale-110 ${
                isRunning
                  ? 'bg-red-500 hover:bg-red-400'
                  : isError
                    ? 'bg-orange-500 hover:bg-orange-400'
                    : 'bg-indigo-500 hover:bg-indigo-400'
              }`}
            >
              {isRunning ? (
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="6" width="12" height="12" rx="1" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 flex items-center justify-between">
        <span className="text-sm font-medium text-white truncate">{game.name}</span>

        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1 rounded hover:bg-gray-800 text-gray-400 hover:text-gray-200 transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="5" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="12" cy="19" r="1.5" />
            </svg>
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => { setMenuOpen(false); setConfirmDelete(false); setConfirmReset(false) }} />
              <div className="absolute right-0 bottom-full mb-1 w-44 rounded-lg bg-gray-800 border border-gray-700 shadow-xl z-50 py-1">
                {confirmDelete ? (
                  <>
                    <div className="px-3 py-2 text-xs text-gray-400">Delete bottle data too?</div>
                    <MenuBtn danger onClick={() => handleDelete(true)}>Delete + Bottle</MenuBtn>
                    <MenuBtn onClick={() => handleDelete(false)}>Remove from Library</MenuBtn>
                    <MenuBtn onClick={() => { setConfirmDelete(false); setMenuOpen(false) }}>Cancel</MenuBtn>
                  </>
                ) : confirmReset ? (
                  <>
                    <div className="px-3 py-2 text-xs text-gray-400">This will delete the Wine environment for this game.</div>
                    <MenuBtn danger onClick={handleResetBottle}>Confirm Reset</MenuBtn>
                    <MenuBtn onClick={() => { setConfirmReset(false); setMenuOpen(false) }}>Cancel</MenuBtn>
                  </>
                ) : (
                  <>
                    <MenuBtn onClick={() => { setSelectedGameId(game.id); setMenuOpen(false) }}>Configure</MenuBtn>
                    <MenuBtn onClick={() => { openLogViewer(game.id); setMenuOpen(false) }}>View Logs</MenuBtn>
                    <MenuBtn onClick={() => { window.api?.openBottleFolder(game.bottlePath); setMenuOpen(false) }}>Open Bottle Folder</MenuBtn>
                    <div className="border-t border-gray-700 my-1" />
                    <MenuBtn onClick={() => setConfirmReset(true)}>Reset Bottle</MenuBtn>
                    <MenuBtn danger onClick={() => setConfirmDelete(true)}>Delete</MenuBtn>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function MenuBtn({ children, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${
        danger
          ? 'text-red-400 hover:bg-red-500/10'
          : 'text-gray-300 hover:bg-gray-700'
      }`}
    >
      {children}
    </button>
  )
}
