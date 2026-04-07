const { spawn, execFile } = require('child_process')
const fs = require('fs')
const path = require('path')
const os = require('os')

const runningProcesses = new Map()

function getBottlesDir() {
  return path.join(os.homedir(), 'NoWindowsNoProblem', 'bottles')
}

async function checkDependencies(winePath) {
  const results = { wine: false, rosetta: false, xquartz: false }

  // Wine check
  try {
    await fs.promises.access(winePath, fs.constants.X_OK)
    results.wine = true
  } catch {
    results.wine = false
  }

  // Rosetta 2 check
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

  // XQuartz check
  try {
    await fs.promises.access('/Applications/Utilities/XQuartz.app')
    results.xquartz = true
  } catch {
    results.xquartz = false
  }

  return results
}

async function initBottle(bottlePath, arch, winePath, onLog) {
  await fs.promises.mkdir(bottlePath, { recursive: true })

  return new Promise((resolve, reject) => {
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

    proc.on('error', reject)
  })
}

async function launchGame(game, winePath, onLog, onStateChange) {
  if (runningProcesses.has(game.id)) {
    throw new Error('Game is already running')
  }

  // Check exe exists
  try {
    await fs.promises.access(game.exePath)
  } catch {
    throw new Error(`Executable not found: ${game.exePath}`)
  }

  // Init bottle if needed
  const bottleExists = await fs.promises.access(game.bottlePath).then(() => true).catch(() => false)

  if (!bottleExists) {
    onStateChange({ gameId: game.id, state: 'initialising' })
    onLog({ gameId: game.id, line: '[System] Initialising Wine bottle...\n', stream: 'system' })

    try {
      await initBottle(game.bottlePath, game.arch, winePath, (data) => {
        onLog({ gameId: game.id, ...data })
      })
      onLog({ gameId: game.id, line: '[System] Wine bottle ready.\n', stream: 'system' })
    } catch (err) {
      onStateChange({ gameId: game.id, state: 'stopped' })
      throw new Error(`Bottle init failed: ${err.message}`)
    }
  }

  // Launch game
  const extraArgs = game.args ? game.args.split(/\s+/).filter(Boolean) : []
  const env = {
    ...process.env,
    WINEPREFIX: game.bottlePath,
    WINEARCH: game.arch,
    WINEDEBUG: '-all',
    ...(game.envVars || {})
  }

  const proc = spawn(winePath, [game.exePath, ...extraArgs], { env, detached: true })
  runningProcesses.set(game.id, proc)

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
    onStateChange({ gameId: game.id, state: 'stopped' })
    onLog({ gameId: game.id, line: `[System] Process exited with code ${code}\n`, stream: 'system' })
  })

  proc.on('error', (err) => {
    runningProcesses.delete(game.id)
    onStateChange({ gameId: game.id, state: 'stopped' })
    onLog({ gameId: game.id, line: `[System Error] ${err.message}\n`, stream: 'stderr' })
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
}

async function resetBottle(bottlePath) {
  try {
    await fs.promises.rm(bottlePath, { recursive: true, force: true })
  } catch {
    // Already gone
  }
}

module.exports = { checkDependencies, launchGame, killGame, killAll, resetBottle, getBottlesDir }
