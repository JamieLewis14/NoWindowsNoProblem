import useGameStore from '../store/useGameStore'
import GameCard from './GameCard'

export default function GameLibrary() {
  const games = useGameStore((s) => s.games)
  const setShowAddModal = useGameStore((s) => s.setShowAddModal)

  const handleDrop = (e) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files)
    const exe = files.find((f) => f.name.endsWith('.exe'))
    if (exe) {
      useGameStore.setState({
        showAddModal: true,
        _droppedExePath: exe.path
      })
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  if (games.length === 0) {
    return (
      <div
        className="flex-1 flex items-center justify-center p-8"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <div
          className="max-w-md w-full border-2 border-dashed border-gray-700 rounded-2xl p-12 text-center hover:border-indigo-500/50 transition-colors cursor-pointer"
          onClick={() => setShowAddModal(true)}
        >
          <div className="w-16 h-16 rounded-2xl bg-gray-800 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white mb-1">Add your first game</h3>
          <p className="text-sm text-gray-400 mb-4">
            Drag and drop a .exe file here, or click to browse
          </p>
          <span className="text-xs text-gray-600">Supports Windows .exe files</span>
        </div>
      </div>
    )
  }

  return (
    <div
      className="flex-1 overflow-y-auto p-6"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <div className="flex items-center justify-between mb-6 pt-4">
        <h2 className="text-xl font-bold text-white">Library</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Game
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {games.map((game) => (
          <GameCard key={game.id} game={game} />
        ))}
      </div>
    </div>
  )
}
