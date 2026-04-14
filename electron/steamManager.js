const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')
const os = require('os')

const STEAM_BOTTLE_ID = '_steam'

let steamProcess = null

function getBottlesDir() {
  return path.join(os.homedir(), 'NoWindowsNoProblem', 'bottles')
}

function getSteamBottlePath() {
  return path.join(getBottlesDir(), STEAM_BOTTLE_ID)
}

function isSteamBottlePath(p) {
  if (!p) return false
  return path.resolve(p) === path.resolve(getSteamBottlePath())
}

function findSteamExe(bottlePath) {
  const candidates = [
    path.join(bottlePath, 'drive_c', 'Program Files (x86)', 'Steam', 'steam.exe'),
    path.join(bottlePath, 'drive_c', 'Program Files', 'Steam', 'steam.exe')
  ]
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate
  }
  return null
}

function isSteamAlive() {
  if (!steamProcess || !steamProcess.pid) return false
  try {
    process.kill(steamProcess.pid, 0)
    return true
  } catch {
    return false
  }
}

function launchSteam(winePath, bottlePath, onLog) {
  if (isSteamAlive()) return steamProcess

  const steamExe = findSteamExe(bottlePath)
  if (!steamExe) {
    throw new Error(`Steam is not installed in the shared bottle at ${bottlePath}`)
  }

  const env = {
    ...process.env,
    WINEPREFIX: bottlePath,
    WINEARCH: 'win64',
    WINEDEBUG: '-all'
  }

  const proc = spawn(winePath, [steamExe, '-no-cef-sandbox'], { env, detached: true })

  proc.stdout.on('data', (data) => {
    onLog({ line: `[Steam] ${data.toString()}`, stream: 'stdout' })
  })

  proc.stderr.on('data', (data) => {
    onLog({ line: `[Steam] ${data.toString()}`, stream: 'stderr' })
  })

  proc.on('close', (code) => {
    onLog({ line: `[Steam] Process exited with code ${code}\n`, stream: 'system' })
    if (steamProcess === proc) steamProcess = null
  })

  proc.on('error', (err) => {
    const msg =
      err && err.code === 'ENOENT'
        ? `Wine binary at ${winePath} is missing or not executable. Fix the Wine path in Settings → System Check.`
        : err.message
    onLog({ line: `[Steam] Error: ${msg}\n`, stream: 'error' })
    if (steamProcess === proc) steamProcess = null
  })

  steamProcess = proc
  return proc
}

function waitForSteamReady(steamProc, timeoutMs = 45000) {
  return new Promise((resolve, reject) => {
    if (!steamProc) return reject(new Error('No Steam process to wait on'))

    const earlyCrashMs = 2000
    const readyDelayMs = 10000
    const launchTime = Date.now()
    let resolved = false

    const onEarlyExit = (code) => {
      if (resolved) return
      const elapsed = Date.now() - launchTime
      if (elapsed < earlyCrashMs) {
        resolved = true
        reject(new Error(`Steam crashed on startup (exit code ${code} after ${elapsed}ms)`))
      }
    }

    steamProc.once('close', onEarlyExit)

    setTimeout(() => {
      if (resolved) return
      resolved = true
      steamProc.removeListener('close', onEarlyExit)
      if (isSteamAlive()) {
        resolve()
      } else {
        reject(new Error('Steam process died before becoming ready'))
      }
    }, readyDelayMs)

    setTimeout(() => {
      if (resolved) return
      resolved = true
      steamProc.removeListener('close', onEarlyExit)
      reject(new Error(`Steam did not become ready within ${timeoutMs}ms`))
    }, timeoutMs)
  })
}

function killSteam() {
  if (!steamProcess) return
  try {
    process.kill(-steamProcess.pid, 'SIGTERM')
  } catch {
    try { steamProcess.kill('SIGTERM') } catch { /* already dead */ }
  }
  steamProcess = null
}

function getSteamProcess() {
  return steamProcess
}

module.exports = {
  STEAM_BOTTLE_ID,
  getSteamBottlePath,
  isSteamBottlePath,
  findSteamExe,
  isSteamAlive,
  launchSteam,
  waitForSteamReady,
  killSteam,
  getSteamProcess
}
