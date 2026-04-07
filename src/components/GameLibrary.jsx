import { useState } from 'react'
import useGameStore from '../store/useGameStore'
import GameCard from './GameCard'

export default function GameLibrary() {
  const games = useGameStore((s) => s.games)
  const setShowAddModal = useGameStore((s) => s.setShowAddModal)
  const setPendingExePath = useGameStore((s) => s.setPendingExePath)
  const [dragOver, setDragOver] = useState(false)
  const [dropError, setDropError] = useState(null)

  const openFilePicker = async () => {
    if (!window.api) return
    const path = await window.api.openFilePicker({
      title: 'Select a Windows executable',
      filters: [{ name: 'Windows Executable', extensions: ['exe'] }]
    })
    if (path) {
      setPendingExePath(path)
      setShowAddModal(true)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setDragOver(true)
    setDropError(null)
  }

  const handleDragLeave = (e) => {
    // Only clear if leaving the whole zone (not a child)
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOver(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length === 0) return

    const exe = files.find((f) => f.name.toLowerCase().endsWith('.exe'))
    if (!exe) {
      setDropError('Only .exe files are supported')
      setTimeout(() => setDropError(null), 3000)
      return
    }

    setPendingExePath(exe.path)
    setShowAddModal(true)
  }

  if (games.length === 0) {
    return (
      <div
        className="flex-1 flex items-center justify-center p-8"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div
          onClick={openFilePicker}
          className={`max-w-md w-full border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all select-none ${
            dragOver
              ? 'border-indigo-500 bg-indigo-500/5 scale-[1.02]'
              : dropError
                ? 'border-red-500/50 bg-red-950/10'
                : 'border-gray-700 hover:border-indigo-500/50 hover:bg-gray-900/30'
          }`}
        >
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-colors ${
            dragOver ? 'bg-indigo-500/20' : 'bg-gray-800'
          }`}>
            {dragOver ? (
              <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            ) : (
              <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            )}
          </div>

          {dropError ? (
            <>
              <h3 className="text-lg font-semibold text-red-400 mb-1">Invalid file</h3>
              <p className="text-sm text-red-400/70">{dropError}</p>
            </>
          ) : dragOver ? (
            <>
              <h3 className="text-lg font-semibold text-indigo-300 mb-1">Drop to add game</h3>
              <p className="text-sm text-indigo-400/60">Release to open the game setup</p>
            </>
          ) : (
            <>
              <h3 className="text-lg font-semibold text-white mb-1">Add your first game</h3>
              <p className="text-sm text-gray-400 mb-4">
                Drag and drop a <code className="text-gray-300 bg-gray-800 px-1 py-0.5 rounded text-xs">.exe</code> file here, or click to browse
              </p>
              <span className="text-xs text-gray-600">Supports Windows executables via Wine</span>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      className={`flex-1 overflow-y-auto p-6 transition-colors ${dragOver ? 'bg-indigo-500/5' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex items-center justify-between mb-6 pt-4">
        <h2 className="text-xl font-bold text-white">Library</h2>
        <div className="flex items-center gap-2">
          {dropError && (
            <span className="text-xs text-red-400 mr-2">{dropError}</span>
          )}
          <button
            onClick={openFilePicker}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Game
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {games.map((game) => (
          <GameCard key={game.id} game={game} />
        ))}
      </div>
    </div>
  )
}
