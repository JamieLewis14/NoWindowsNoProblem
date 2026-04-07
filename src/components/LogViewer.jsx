import { useRef, useEffect, useState } from 'react'
import useGameStore from '../store/useGameStore'

export default function LogViewer() {
  const logViewerGameId = useGameStore((s) => s.logViewerGameId)
  const logs = useGameStore((s) => s.logs[logViewerGameId] || [])
  const games = useGameStore((s) => s.games)
  const clearLogs = useGameStore((s) => s.clearLogs)
  const closeLogViewer = useGameStore((s) => s.closeLogViewer)

  const [autoScroll, setAutoScroll] = useState(true)
  const scrollRef = useRef(null)

  const game = games.find((g) => g.id === logViewerGameId)

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs, autoScroll])

  const handleScroll = () => {
    if (!scrollRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
    const atBottom = scrollHeight - scrollTop - clientHeight < 40
    setAutoScroll(atBottom)
  }

  const copyAll = () => {
    const text = logs.map((l) => l.line).join('')
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 h-72 bg-gray-900 border-t border-gray-800 flex flex-col shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-3">
          <h4 className="text-sm font-semibold text-white">Logs</h4>
          {game && <span className="text-xs text-gray-500">{game.name}</span>}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`text-xs px-2 py-1 rounded transition-colors ${
              autoScroll
                ? 'text-indigo-400 bg-indigo-500/10'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Auto-scroll {autoScroll ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={copyAll}
            className="text-xs px-2 py-1 rounded text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors"
          >
            Copy All
          </button>
          <button
            onClick={() => clearLogs(logViewerGameId)}
            className="text-xs px-2 py-1 rounded text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors"
          >
            Clear
          </button>
          <button
            onClick={closeLogViewer}
            className="p-1 rounded hover:bg-gray-800 text-gray-400 hover:text-gray-200 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Log lines */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-2 font-mono text-xs leading-5"
      >
        {logs.length === 0 ? (
          <p className="text-gray-600 py-4 text-center">No logs yet. Launch a game to see output here.</p>
        ) : (
          logs.map((entry, i) => (
            <div
              key={i}
              className={
                entry.stream === 'stderr'
                  ? 'text-red-400/80'
                  : entry.stream === 'system'
                    ? 'text-indigo-400/70'
                    : 'text-gray-400'
              }
            >
              {entry.line}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
