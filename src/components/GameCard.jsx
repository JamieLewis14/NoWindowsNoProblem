import { useState } from 'react'
import useGameStore from '../store/useGameStore'

export default function GameCard({ game }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const runningState = useGameStore((s) => s.runningGames[game.id])
  const removeGame = useGameStore((s) => s.removeGame)
  const setSelectedGameId = useGameStore((s) => s.setSelectedGameId)
  const openLogViewer = useGameStore((s) => s.openLogViewer)

  const isRunning = runningState === 'running'
  const isInit = runningState === 'initialising'
  const isBusy = isRunning || isInit

  const handlePlay = async () => {
    if (isBusy) {
      await window.api.killGame(game.id)
    } else {
      try {
        await window.api.launchGame(game)
      } catch (err) {
        openLogViewer(game.id)
      }
    }
  }

  const handleDelete = async (deleteBottle) => {
    if (deleteBottle) {
      await window.api.resetBottle(game)
    }
    await removeGame(game.id)
    setConfirmDelete(false)
    setMenuOpen(false)
  }

  const exeMissing = false // TODO: could check async

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

        {/* Running indicator */}
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
        {exeMissing && (
          <div className="absolute top-2 left-2 px-2 py-1 rounded-full bg-red-500/20 backdrop-blur-sm">
            <span className="text-[10px] text-red-300 font-medium">EXE not found</span>
          </div>
        )}

        {/* Play overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          <button
            onClick={handlePlay}
            disabled={exeMissing}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-transform hover:scale-110 ${
              isBusy
                ? 'bg-red-500 hover:bg-red-400'
                : 'bg-indigo-500 hover:bg-indigo-400'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isBusy ? (
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" rx="1" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 flex items-center justify-between">
        <span className="text-sm font-medium text-white truncate">{game.name}</span>

        {/* Kebab menu */}
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
              <div className="fixed inset-0 z-40" onClick={() => { setMenuOpen(false); setConfirmDelete(false) }} />
              <div className="absolute right-0 bottom-full mb-1 w-40 rounded-lg bg-gray-800 border border-gray-700 shadow-xl z-50 py-1">
                {!confirmDelete ? (
                  <>
                    <MenuBtn onClick={() => { setSelectedGameId(game.id); setMenuOpen(false) }}>
                      Configure
                    </MenuBtn>
                    <MenuBtn onClick={() => { openLogViewer(game.id); setMenuOpen(false) }}>
                      View Logs
                    </MenuBtn>
                    <div className="border-t border-gray-700 my-1" />
                    <MenuBtn danger onClick={() => setConfirmDelete(true)}>
                      Delete
                    </MenuBtn>
                  </>
                ) : (
                  <>
                    <div className="px-3 py-2 text-xs text-gray-400">Delete bottle data too?</div>
                    <MenuBtn danger onClick={() => handleDelete(true)}>
                      Delete + Bottle
                    </MenuBtn>
                    <MenuBtn onClick={() => handleDelete(false)}>
                      Remove from Library
                    </MenuBtn>
                    <MenuBtn onClick={() => { setConfirmDelete(false); setMenuOpen(false) }}>
                      Cancel
                    </MenuBtn>
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
