const { spawn, execFile } = require('child_process')
const fs = require('fs')
const path = require('path')
const os = require('os')
const steamManager = require('./steamManager')

const runningProcesses = new Map()

function wrapSpawnError(err, winePath) {
  if (err && err.code === 'ENOENT') {
    return new Error(
      `Wine binary at ${winePath} is missing or not executable. Fix the Wine path in Settings → System Check.`
    )
  }
  return err
}

function getBottlesDir() {
  return path.join(os.homedir(), 'NoWindowsNoProblem', 'bottles')
}

function bottleExists(gameId) {
  const bottlePath = path.join(getBottlesDir(), gameId)
  return fs.existsSync(path.join(bottlePath, 'system.reg'))
}

async function checkDependencies(winePath) {
  const results = { wine: false, rosetta: false, xquartz: false }

  try {
    await fs.promises.access(winePath, fs.constants.X_OK)
    results.wine = true
  } catch {
    results.wine = false
  }

  try {
    await new Promise((resolve, reject) => {
      execFile('arch', ['-x86_64', 'echo', 'ok'], (err) => {
        if (err) reject(err)
        else resolve()
      })
    })
    results.rosetta = true
  } catch {
    results.rosetta = false
  }

  try {
    await fs.promises.access('/Applications/Utilities/XQuartz.app')
    results.xquartz = true
  } catch {
    results.xquartz = false
  }

  return results
}

function runWineCommand(winePath, args, bottlePath, arch, onLog) {
  return new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      WINEPREFIX: bottlePath,
      WINEARCH: arch,
      WINEDEBUG: '-all'
    }

    const proc = spawn(winePath, args, { env })

    proc.stdout.on('data', (data) => {
      onLog({ line: data.toString(), stream: 'stdout' })
    })

    proc.stderr.on('data', (data) => {
      onLog({ line: data.toString(), stream: 'stderr' })
    })

    proc.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`wine ${args[0]} exited with code ${code}`))
    })

    proc.on('error', (err) => reject(wrapSpawnError(err, winePath)))
  })
}

const WINDOWS_VERSION_MAP = {
  win10: {
    ProductName: 'Windows 10 Pro',
    CurrentBuildNumber: '19041',
    CurrentVersion: '6.3',
    CSDVersion: ''
  },
  win7: {
    ProductName: 'Windows 7 Professional',
    CurrentBuildNumber: '7601',
    CurrentVersion: '6.1',
    CSDVersion: 'Service Pack 1'
  },
  winxp: {
    ProductName: 'Microsoft Windows XP',
    CurrentBuildNumber: '2600',
    CurrentVersion: '5.1',
    CSDVersion: 'Service Pack 3'
  }
}

async function setWindowsVersion(bottlePath, winePath, version, arch, onLog) {
  const entries = WINDOWS_VERSION_MAP[version]
  if (!entries) {
    onLog({ line: `[System] Unknown Windows version: ${version}, skipping.\n`, stream: 'system' })
    return
  }

  onLog({ line: `[System] Setting Windows version to ${version}...\n`, stream: 'system' })

  const regKey = 'HKLM\\Software\\Microsoft\\Windows NT\\CurrentVersion'
  for (const [name, value] of Object.entries(entries)) {
    const args = ['reg', 'add', regKey, '/v', name, '/d', value, '/f']
    try {
      await runWineCommand(winePath, args, bottlePath, arch, onLog)
    } catch (err) {
      onLog({ line: `[System] Failed to set ${name}: ${err.message}\n`, stream: 'error' })
    }
  }

  onLog({ line: `[System] Windows version set.\n`, stream: 'system' })
}

async function initBottle(bottlePath, arch, winePath, onLog, winVersion) {
  await fs.promises.mkdir(bottlePath, { recursive: true })

  await new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      WINEPREFIX: bottlePath,
      WINEARCH: arch,
      WINEDEBUG: '-all'
    }

    const proc = spawn(winePath, ['wineboot', '--init'], { env })

    proc.stdout.on('data', (data) => {
      onLog({ line: data.toString(), stream: 'stdout' })
    })

    proc.stderr.on('data', (data) => {
      onLog({ line: data.toString(), stream: 'stderr' })
    })

    proc.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`wineboot exited with code ${code}`))
    })

    proc.on('error', (err) => reject(wrapSpawnError(err, winePath)))
  })

  if (winVersion) {
    await setWindowsVersion(bottlePath, winePath, winVersion, arch, onLog)
  }
}

async function ensureSteamBottle(winePath, onLog) {
  const bottlePath = steamManager.getSteamBottlePath()
  const hasBottle = await fs.promises.access(path.join(bottlePath, 'system.reg')).then(() => true).catch(() => false)

  if (!hasBottle) {
    onLog({ line: '[System] Initialising shared Steam bottle...\n', stream: 'system' })
    await initBottle(bottlePath, 'win64', winePath, onLog, 'win10')
    onLog({ line: '[System] Shared Steam bottle ready.\n', stream: 'system' })
  }

  return bottlePath
}

async function installSteam(installerPath, winePath, onLog) {
  try {
    await fs.promises.access(installerPath)
  } catch {
    throw new Error(`Steam installer not found at ${installerPath}`)
  }

  const bottlePath = await ensureSteamBottle(winePath, onLog)

  onLog({ line: `[System] Running Steam installer: ${installerPath}\n`, stream: 'system' })

  return new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      WINEPREFIX: bottlePath,
      WINEARCH: 'win64',
      WINEDEBUG: '-all'
    }

    const proc = spawn(winePath, [installerPath], { env })

    proc.stdout.on('data', (data) => {
      onLog({ line: data.toString(), stream: 'stdout' })
    })

    proc.stderr.on('data', (data) => {
      onLog({ line: data.toString(), stream: 'stderr' })
    })

    proc.on('close', (code) => {
      if (code === 0) {
        onLog({ line: '[System] Steam installer exited normally.\n', stream: 'system' })
        resolve()
      } else {
        onLog({ line: `[System] Steam installer exited with code ${code}\n`, stream: 'system' })
        // Still resolve — the installer sometimes returns non-zero but still works
        resolve()
      }
    })

    proc.on('error', (err) => reject(wrapSpawnError(err, winePath)))
  })
}

async function launchSteamOnly(winePath, onLog) {
  const bottlePath = await ensureSteamBottle(winePath, onLog)

  const steamExe = steamManager.findSteamExe(bottlePath)
  if (!steamExe) {
    throw new Error('Steam is not installed in the shared bottle. Use the Steam setup guide to install it first.')
  }

  if (steamManager.isSteamAlive()) {
    onLog({ line: '[System] Steam is already running.\n', stream: 'system' })
    return
  }

  onLog({ line: '[System] Launching Steam with -no-cef-sandbox...\n', stream: 'system' })
  const steamProc = steamManager.launchSteam(winePath, bottlePath, onLog)

  try {
    await steamManager.waitForSteamReady(steamProc)
    onLog({ line: '[System] Steam is ready.\n', stream: 'system' })
  } catch (err) {
    onLog({ line: `[System] ${err.message}\n`, stream: 'error' })
    throw err
  }
}

async function launchGame(game, winePath, onLog, onStateChange) {
  if (runningProcesses.has(game.id)) {
    throw new Error('Game is already running')
  }

  // Check exe exists
  try {
    await fs.promises.access(game.exePath)
  } catch {
    throw new Error(`Executable not found at ${game.exePath}`)
  }

  const isSteamGame = game.gameType === 'steam'
  const effectiveBottlePath = isSteamGame
    ? steamManager.getSteamBottlePath()
    : game.bottlePath

  // Init bottle if needed
  const hasBottle = await fs.promises.access(path.join(effectiveBottlePath, 'system.reg')).then(() => true).catch(() => false)

  if (!hasBottle) {
    onStateChange({ gameId: game.id, state: 'initialising' })
    onLog({ gameId: game.id, line: '[System] Initialising Wine bottle...\n', stream: 'system' })

    try {
      await initBottle(
        effectiveBottlePath,
        game.arch || 'win64',
        winePath,
        (data) => onLog({ gameId: game.id, ...data }),
        game.winVersion || (isSteamGame ? 'win10' : undefined)
      )
      onLog({ gameId: game.id, line: '[System] Wine bottle ready.\n', stream: 'system' })
    } catch (err) {
      onStateChange({ gameId: game.id, state: 'error' })
      onLog({ gameId: game.id, line: `[Error] Bottle init failed: ${err.message}\n`, stream: 'error' })
      throw new Error(`Bottle init failed: ${err.message}`)
    }
  }

  // For Steam games, ensure Steam is running before launching the game exe
  if (isSteamGame) {
    const steamExe = steamManager.findSteamExe(effectiveBottlePath)
    if (!steamExe) {
      const msg = 'Steam is not installed in the shared bottle. Use the Steam setup guide to install it first.'
      onStateChange({ gameId: game.id, state: 'error' })
      onLog({ gameId: game.id, line: `[Error] ${msg}\n`, stream: 'error' })
      throw new Error(msg)
    }

    if (!steamManager.isSteamAlive()) {
      onStateChange({ gameId: game.id, state: 'starting-steam' })
      onLog({ gameId: game.id, line: '[System] Launching Steam with -no-cef-sandbox...\n', stream: 'system' })

      try {
        const steamProc = steamManager.launchSteam(winePath, effectiveBottlePath, (data) => {
          onLog({ gameId: game.id, ...data })
        })
        await steamManager.waitForSteamReady(steamProc)
        onLog({ gameId: game.id, line: '[System] Steam is ready.\n', stream: 'system' })
      } catch (err) {
        onStateChange({ gameId: game.id, state: 'error', crashedOnStartup: true })
        onLog({ gameId: game.id, line: `[Error] ${err.message}\n`, stream: 'error' })
        throw err
      }
    } else {
      onLog({ gameId: game.id, line: '[System] Reusing running Steam process.\n', stream: 'system' })
    }
  }

  // Launch game
  const extraArgs = game.args ? game.args.split(/\s+/).filter(Boolean) : []
  const env = {
    ...process.env,
    WINEPREFIX: effectiveBottlePath,
    WINEARCH: game.arch || 'win64',
    WINEDEBUG: '-all',
    ...(game.envVars || {})
  }

  const proc = spawn(winePath, [game.exePath, ...extraArgs], { env, detached: true })
  runningProcesses.set(game.id, proc)

  const launchTime = Date.now()

  onStateChange({ gameId: game.id, state: 'running' })
  onLog({ gameId: game.id, line: `[System] Launched: ${game.exePath}\n`, stream: 'system' })

  proc.stdout.on('data', (data) => {
    onLog({ gameId: game.id, line: data.toString(), stream: 'stdout' })
  })

  proc.stderr.on('data', (data) => {
    onLog({ gameId: game.id, line: data.toString(), stream: 'stderr' })
  })

  proc.on('close', (code) => {
    runningProcesses.delete(game.id)
    const elapsed = Date.now() - launchTime
    const crashedOnStartup = code !== 0 && elapsed < 2000

    if (crashedOnStartup) {
      onStateChange({ gameId: game.id, state: 'error', crashedOnStartup: true })
      onLog({ gameId: game.id, line: `[Error] Process crashed on startup (exited with code ${code} after ${elapsed}ms)\n`, stream: 'error' })
    } else if (code !== 0) {
      onStateChange({ gameId: game.id, state: 'error' })
      onLog({ gameId: game.id, line: `[System] Process exited with code ${code}\n`, stream: 'system' })
    } else {
      onStateChange({ gameId: game.id, state: 'stopped' })
      onLog({ gameId: game.id, line: '[System] Process exited normally.\n', stream: 'system' })
    }
  })

  proc.on('error', (err) => {
    runningProcesses.delete(game.id)
    const wrapped = wrapSpawnError(err, winePath)
    onStateChange({ gameId: game.id, state: 'error' })
    onLog({ gameId: game.id, line: `[Error] ${wrapped.message}\n`, stream: 'error' })
  })
}

function killGame(gameId) {
  const proc = runningProcesses.get(gameId)
  if (proc) {
    try {
      process.kill(-proc.pid, 'SIGTERM')
    } catch {
      try { proc.kill('SIGTERM') } catch { /* already dead */ }
    }
    runningProcesses.delete(gameId)
  }
}

function killAll() {
  for (const [id] of runningProcesses) {
    killGame(id)
  }
  steamManager.killSteam()
}

async function resetBottle(bottlePath) {
  // If resetting the shared Steam bottle, kill Steam first
  if (steamManager.isSteamBottlePath(bottlePath)) {
    steamManager.killSteam()
  }
  try {
    await fs.promises.rm(bottlePath, { recursive: true, force: true })
  } catch {
    // Already gone
  }
}

async function resetSteamBottle() {
  steamManager.killSteam()
  const bottlePath = steamManager.getSteamBottlePath()
  try {
    await fs.promises.rm(bottlePath, { recursive: true, force: true })
  } catch {
    // Already gone
  }
}

function getSteamStatus() {
  const bottlePath = steamManager.getSteamBottlePath()
  const exePath = steamManager.findSteamExe(bottlePath)
  return {
    installed: exePath !== null,
    running: steamManager.isSteamAlive(),
    exePath,
    bottlePath
  }
}

module.exports = {
  checkDependencies,
  launchGame,
  killGame,
  killAll,
  resetBottle,
  resetSteamBottle,
  getBottlesDir,
  bottleExists,
  installSteam,
  launchSteamOnly,
  getSteamStatus
}
