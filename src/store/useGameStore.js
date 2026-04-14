import { create } from 'zustand'

const MAX_LOG_LINES = 500

const useGameStore = create((set, get) => ({
  games: [],
  runningGames: {},
  logs: {},
  setupStatus: null,
  setupComplete: null,
  activeView: 'library',
  selectedGameId: null,
  showAddModal: false,
  showLogViewer: false,
  logViewerGameId: null,
  pendingExePath: null,
  showSteamSetup: false,
  toast: null, // { message, type: 'error' | 'info' }

  setActiveView: (view) => set({ activeView: view }),
  setSelectedGameId: (id) => set({ selectedGameId: id }),
  setShowAddModal: (show) => set({ showAddModal: show }),
  setPendingExePath: (path) => set({ pendingExePath: path }),
  setShowSteamSetup: (show) => set({ showSteamSetup: show }),

  openLogViewer: (gameId) => set({ showLogViewer: true, logViewerGameId: gameId }),
  closeLogViewer: () => set({ showLogViewer: false }),

  showToast: (message, type = 'error') => {
    set({ toast: { message, type } })
    setTimeout(() => set({ toast: null }), 5000)
  },
  dismissToast: () => set({ toast: null }),

  init: async () => {
    if (!window.api) {
      set({ setupComplete: false, setupStatus: { wine: false, rosetta: false, xquartz: false } })
      return
    }
    const [games, setupComplete] = await Promise.all([
      window.api.getGames(),
      window.api.getSetting('setupComplete')
    ])

    // Re-verify Wine even when setupComplete is persisted true — catches the
    // case where Wine was uninstalled after the user completed setup.
    if (setupComplete === true) {
      const status = await window.api.checkDependencies()
      if (!status.wine) {
        set({ games: games || [], setupComplete: false, setupStatus: status })
        return
      }
      set({ games: games || [], setupComplete: true, setupStatus: status })
      return
    }

    set({ games: games || [], setupComplete: false })
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

  setRunningState: (gameId, state, extra) => {
    set((prev) => {
      const next = { ...prev.runningGames }
      if (state === 'stopped') {
        delete next[gameId]
      } else {
        next[gameId] = state
      }
      return { runningGames: next }
    })

    // Show toast on startup crash
    if (state === 'error' && extra?.crashedOnStartup) {
      get().showToast('Game crashed on startup — check the logs for details')
      get().openLogViewer(gameId)
    }
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
