import { create } from 'zustand'

const MAX_LOG_LINES = 500

const useGameStore = create((set, get) => ({
  games: [],
  runningGames: {},
  logs: {},
  setupStatus: null,
  setupComplete: null, // null = not yet loaded from store
  activeView: 'library',
  selectedGameId: null,
  showAddModal: false,
  showLogViewer: false,
  logViewerGameId: null,
  pendingExePath: null, // path pre-filled into AddGameModal

  setActiveView: (view) => set({ activeView: view }),
  setSelectedGameId: (id) => set({ selectedGameId: id }),
  setShowAddModal: (show) => set({ showAddModal: show }),
  setPendingExePath: (path) => set({ pendingExePath: path }),

  openLogViewer: (gameId) => set({ showLogViewer: true, logViewerGameId: gameId }),
  closeLogViewer: () => set({ showLogViewer: false }),

  init: async () => {
    if (!window.api) {
      set({ setupComplete: false, setupStatus: { wine: false, rosetta: false, xquartz: false } })
      return
    }
    const [games, setupComplete] = await Promise.all([
      window.api.getGames(),
      window.api.getSetting('setupComplete')
    ])
    set({ games: games || [], setupComplete: setupComplete === true })
  },

  markSetupComplete: async () => {
    if (window.api) await window.api.setSetting('setupComplete', true)
    set({ setupComplete: true, activeView: 'library' })
  },

  clearSetupComplete: async () => {
    if (window.api) await window.api.setSetting('setupComplete', false)
    set({ setupComplete: false })
  },

  addGame: async (game) => {
    const games = [...get().games, game]
    if (window.api) await window.api.saveGames(games)
    set({ games })
  },

  removeGame: async (gameId) => {
    const games = get().games.filter((g) => g.id !== gameId)
    if (window.api) await window.api.saveGames(games)
    set({ games })
  },

  updateGame: async (gameId, updates) => {
    const games = get().games.map((g) =>
      g.id === gameId ? { ...g, ...updates } : g
    )
    if (window.api) await window.api.saveGames(games)
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
