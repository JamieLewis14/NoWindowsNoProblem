const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  checkDependencies: () => ipcRenderer.invoke('check-dependencies'),
  openFilePicker: (options) => ipcRenderer.invoke('open-file-picker', options),
  getGames: () => ipcRenderer.invoke('get-games'),
  saveGames: (games) => ipcRenderer.invoke('save-games', games),
  getSetting: (key) => ipcRenderer.invoke('get-setting', key),
  setSetting: (key, value) => ipcRenderer.invoke('set-setting', key, value),
  launchGame: (game) => ipcRenderer.invoke('launch-game', game),
  killGame: (gameId) => ipcRenderer.invoke('kill-game', gameId),
  resetBottle: (game) => ipcRenderer.invoke('reset-bottle', game),
  openBottleFolder: (bottlePath) => ipcRenderer.invoke('open-bottle-folder', bottlePath),
  bottleExists: (gameId) => ipcRenderer.invoke('bottle-exists', gameId),
  getHomeDir: () => ipcRenderer.invoke('get-home-dir'),
  detectWinePath: () => ipcRenderer.invoke('detect-wine-path'),
  setWinePath: (winePath) => ipcRenderer.invoke('set-wine-path', winePath),
  getWinePath: () => ipcRenderer.invoke('get-wine-path'),
  getSteamStatus: () => ipcRenderer.invoke('get-steam-status'),
  launchSteamOnly: () => ipcRenderer.invoke('launch-steam-only'),
  installSteam: (installerPath) => ipcRenderer.invoke('install-steam', installerPath),
  resetSteamBottle: () => ipcRenderer.invoke('reset-steam-bottle'),
  onLogLine: (callback) => {
    const handler = (_event, data) => callback(data)
    ipcRenderer.on('log-line', handler)
    return () => ipcRenderer.removeListener('log-line', handler)
  },
  onGameStateChange: (callback) => {
    const handler = (_event, data) => callback(data)
    ipcRenderer.on('game-state-change', handler)
    return () => ipcRenderer.removeListener('game-state-change', handler)
  }
})
