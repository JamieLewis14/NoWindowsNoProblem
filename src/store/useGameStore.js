import { create } from 'zustand'

const MAX_LOG_LINES = 500

const useGameStore = create((set, get) => ({
  games: [],
  runningGames: {},
  logs: {},
  setupStatus: null,
  activeView: 'library',
  selectedGameId: null,
  showAddModal: false,
  showLogViewer: false,
  logViewerGameId: null,

  setActiveView: (view) => set({ activeView: view }),
  setSelectedGameId: (id) => set({ selectedGameId: id }),
  setShowAddModal: (show) => set({ showAddModal: show }),

  openLogViewer: (gameId) => set({ showLogViewer: true, logViewerGameId: gameId }),
  closeLogViewer: () => set({ showLogViewer: false }),

  loadGames: async () => {
    const games = await window.api.getGames()
    set({ games: games || [] })
  },

  addGame: async (game) => {
    const games = [...get().games, game]
    await window.api.saveGames(games)
    set({ games })
  },

  removeGame: async (gameId) => {
    const games = get().games.filter((g) => g.id !== gameId)
    await window.api.saveGames(games)
    set({ games })
  },

  updateGame: async (gameId, updates) => {
    const games = get().games.map((g) =>
      g.id === gameId ? { ...g, ...updates } : g
    )
    await window.api.saveGames(games)
    set({ games })
  },

  setRunningState: (gameId, state) => {
    set((prev) => {
      const next = { ...prev.runningGames }
      if (state === 'stopped') {
        delete next[gameId]
      } else {
        next[gameId] = state
      }
      return { runningGames: next }
    })
  },

  appendLog: (gameId, line, stream) => {
    set((prev) => {
      const existing = prev.logs[gameId] || []
      const entry = { line, stream, ts: Date.now() }
      const updated = [...existing, entry].slice(-MAX_LOG_LINES)
      return { logs: { ...prev.logs, [gameId]: updated } }
    })
  },

  clearLogs: (gameId) => {
    set((prev) => ({ logs: { ...prev.logs, [gameId]: [] } }))
  },

  setSetupStatus: (status) => set({ setupStatus: status })
}))

export default useGameStore
