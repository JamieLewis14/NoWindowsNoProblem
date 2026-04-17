const { spawn, execSync } = require('child_process')
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

// True iff a wine-spawned steam.exe is running with WINEPREFIX=bottlePath.
// We match by env var, not command line, because wine reports steam.exe's path
// as a Windows-style C:\ string that doesn't identify which bottle it came from,
// so a global pgrep would falsely report "Steam is up" for Steams in other bottles.
function isSteamAliveByProcess(bottlePath) {
  if (!bottlePath) return false
  let pids
  try {
    pids = execSync('pgrep -f steam.exe', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
  } catch {
    return false
  }
  const needle = `WINEPREFIX=${bottlePath}`
  for (const pid of pids) {
    try {
      // macOS `ps -E` prints environment alongside the command line.
      const envDump = execSync(`ps -E -p ${pid} -o command=`, {
        stdio: ['ignore', 'pipe', 'ignore']
      }).toString()
      if (envDump.includes(needle)) return true
    } catch { /* pid vanished between pgrep and ps — ignore */ }
  }
  return false
}

function isSteamAlive(bottlePath) {
  // Trust our own spawn ref only if the bottle matches what we launched with.
  if (
    steamProcess &&
    steamProcess.pid &&
    steamProcess._bottlePath === bottlePath
  ) {
    try {
      process.kill(steamProcess.pid, 0)
      return true
    } catch { /* fall through to pgrep */ }
  }
  return isSteamAliveByProcess(bottlePath)
}

function launchSteam(winePath, bottlePath, onLog) {
  if (isSteamAlive(bottlePath)) return steamProcess

  const steamExe = findSteamExe(bottlePath)
  if (!steamExe) {
    throw new Error(`Steam is not installed in the shared bottle at ${bottlePath}`)
  }

  const env = {
    ...process.env,
    WINEPREFIX: bottlePath,
    WINEARCH: 'win64',
    WINEDEBUG: '-all',
    // GnuTLS 3.7.x (bundled in wine-crossover 23.7.1) has a TLS 1.3 incompatibility
    // with Fastly/Akamai CDN edge nodes on some home networks — manifests as Steam
    // "needs to be online to update" (http error 0 / connection hang). Force TLS 1.2.
    GNUTLS_SYSTEM_PRIORITY_OVERRIDE: 'NORMAL:-VERS-TLS1.3'
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
    // Only clear steamProcess if the real Steam is also gone (bootstrapper exits with 0)
    if (steamProcess === proc && !isSteamAliveByProcess(bottlePath)) steamProcess = null
  })

  proc.on('error', (err) => {
    const msg =
      err && err.code === 'ENOENT'
        ? `Wine binary at ${winePath} is missing or not executable. Fix the Wine path in Settings → System Check.`
        : err.message
    onLog({ line: `[Steam] Error: ${msg}\n`, stream: 'error' })
    if (steamProcess === proc) steamProcess = null
  })

  proc._bottlePath = bottlePath
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
      // Exit code 0 = bootstrapper handed off to a child process — not a crash
      if (elapsed < earlyCrashMs && code !== 0) {
        resolved = true
        reject(new Error(`Steam crashed on startup (exit code ${code} after ${elapsed}ms)`))
      }
    }

    steamProc.once('close', onEarlyExit)

    setTimeout(() => {
      if (resolved) return
      resolved = true
      steamProc.removeListener('close', onEarlyExit)
      if (isSteamAlive(steamProc._bottlePath)) {
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
