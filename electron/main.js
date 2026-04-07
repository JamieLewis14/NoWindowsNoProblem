const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const path = require('path')
const os = require('os')
const Store = require('electron-store')
const wineManager = require('./wineManager')

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

ipcMain.handle('check-dependencies', () => {
  return wineManager.checkDependencies(store.get('winePath', '/opt/homebrew/bin/wine'))
})

ipcMain.handle('open-file-picker', async (_event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
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
  const winePath = store.get('winePath', '/opt/homebrew/bin/wine')
  try {
    await wineManager.launchGame(game, winePath, (data) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('log-line', data)
      }
    }, (stateChange) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('game-state-change', stateChange)
      }
    })
  } catch (err) {
    throw new Error(err.message)
  }
})

ipcMain.handle('kill-game', (_event, gameId) => {
  wineManager.killGame(gameId)
})

ipcMain.handle('reset-bottle', async (_event, game) => {
  wineManager.killGame(game.id)
  await wineManager.resetBottle(game.bottlePath)
})

ipcMain.handle('open-bottle-folder', (_event, bottlePath) => {
  shell.openPath(bottlePath)
})

ipcMain.handle('get-home-dir', () => {
  return os.homedir()
})
