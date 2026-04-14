const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const path = require('path')
const os = require('os')
const Store = require('electron-store')
const wineManager = require('./wineManager')
const wineDetection = require('./wineDetection')

const store = new Store()
let mainWindow = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#030712',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  const isDev = !app.isPackaged
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist-renderer', 'index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  wineManager.killAll()
  if (process.platform !== 'darwin') app.quit()
})

// --- IPC Handlers ---

ipcMain.handle('check-dependencies', async () => {
  const winePath = await wineDetection.getWinePath(store)
  return wineManager.checkDependencies(winePath)
})

ipcMain.handle('open-file-picker', async (_event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    title: options?.title || 'Select a file',
    filters: options?.filters || []
  })
  if (result.canceled) return null
  return result.filePaths[0]
})

ipcMain.handle('get-games', () => {
  return store.get('games', [])
})

ipcMain.handle('save-games', (_event, games) => {
  store.set('games', games)
})

ipcMain.handle('get-setting', (_event, key) => {
  return store.get(key)
})

ipcMain.handle('set-setting', (_event, key, value) => {
  store.set(key, value)
})

ipcMain.handle('launch-game', async (_event, game) => {
  let winePath
  try {
    winePath = await wineDetection.resolveWinePath(store)
  } catch (err) {
    throw new Error(err.message)
  }

  const sendLog = (data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('log-line', data)
    }
  }

  const sendState = (stateChange) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('game-state-change', stateChange)
    }
  }

  try {
    await wineManager.launchGame(game, winePath, sendLog, sendState)
  } catch (err) {
    // Send the error as a log line so LogViewer can display it
    sendLog({ gameId: game.id, line: `[Error] ${err.message}\n`, stream: 'error' })
    throw new Error(err.message)
  }
})

ipcMain.handle('kill-game', (_event, gameId) => {
  wineManager.killGame(gameId)
})

ipcMain.handle('reset-bottle', async (_event, game) => {
  if (game.gameType === 'steam') {
    throw new Error('Cannot reset an individual Steam game\'s bottle. Use Reset Steam Bottle in Configure.')
  }
  wineManager.killGame(game.id)
  await wineManager.resetBottle(game.bottlePath)
})

ipcMain.handle('get-steam-status', () => {
  return wineManager.getSteamStatus()
})

ipcMain.handle('launch-steam-only', async () => {
  const sendLog = (data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('log-line', { gameId: '_steam', ...data })
    }
  }

  let winePath
  try {
    winePath = await wineDetection.resolveWinePath(store)
  } catch (err) {
    sendLog({ line: `[Error] ${err.message}\n`, stream: 'error' })
    throw new Error(err.message)
  }

  try {
    await wineManager.launchSteamOnly(winePath, sendLog)
  } catch (err) {
    sendLog({ line: `[Error] ${err.message}\n`, stream: 'error' })
    throw new Error(err.message)
  }
})

ipcMain.handle('install-steam', async (_event, installerPath) => {
  const sendLog = (data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('log-line', { gameId: '_steam', ...data })
    }
  }

  let winePath
  try {
    winePath = await wineDetection.resolveWinePath(store)
  } catch (err) {
    sendLog({ line: `[Error] ${err.message}\n`, stream: 'error' })
    throw new Error(err.message)
  }

  try {
    await wineManager.installSteam(installerPath, winePath, sendLog)
  } catch (err) {
    sendLog({ line: `[Error] ${err.message}\n`, stream: 'error' })
    throw new Error(err.message)
  }
})

ipcMain.handle('reset-steam-bottle', async () => {
  await wineManager.resetSteamBottle()
})

ipcMain.handle('open-bottle-folder', (_event, bottlePath) => {
  shell.openPath(bottlePath)
})

ipcMain.handle('bottle-exists', (_event, gameId) => {
  return wineManager.bottleExists(gameId)
})

ipcMain.handle('get-home-dir', () => {
  return os.homedir()
})

ipcMain.handle('detect-wine-path', async () => {
  const result = await wineDetection.probeCandidates()
  if (result.path) {
    store.set('winePath', result.path)
  }
  return result
})

ipcMain.handle('set-wine-path', async (_event, winePath) => {
  if (!winePath) {
    store.delete('winePath')
    return { ok: true, path: null }
  }
  const usable = await wineDetection.isUsableWineBinary(winePath)
  if (!usable) {
    throw new Error(`${winePath} is not an executable file.`)
  }
  store.set('winePath', winePath)
  return { ok: true, path: winePath }
})

ipcMain.handle('get-wine-path', async () => {
  return wineDetection.getWinePath(store)
})
