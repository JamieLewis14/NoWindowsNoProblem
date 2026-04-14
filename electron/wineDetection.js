const fs = require('fs')

// Ordered list of candidate wine binaries. First usable match wins.
// Covers Homebrew (Apple Silicon + Intel) and common Wine.app installs.
const CANDIDATE_PATHS = [
  '/opt/homebrew/bin/wine64',
  '/opt/homebrew/bin/wine',
  '/usr/local/bin/wine64',
  '/usr/local/bin/wine',
  '/Applications/Wine Stable.app/Contents/Resources/wine/bin/wine64',
  '/Applications/Wine Stable.app/Contents/Resources/wine/bin/wine',
  '/Applications/Wine Staging.app/Contents/Resources/wine/bin/wine64',
  '/Applications/Wine Staging.app/Contents/Resources/wine/bin/wine',
  '/Applications/Wine Devel.app/Contents/Resources/wine/bin/wine64',
  '/Applications/Wine Devel.app/Contents/Resources/wine/bin/wine',
  '/Applications/Wine Crossover.app/Contents/Resources/wine/bin/wine64',
  '/Applications/Wine Crossover.app/Contents/Resources/wine/bin/wine'
]

const WINE_NOT_FOUND_MESSAGE =
  'Wine not found. Install Wine (brew install --cask --no-quarantine gcenx/wine/wine-stable) or set a custom path in Settings.'

// True iff the given path is an existing, executable file.
// fs.access follows symlinks, so dangling links correctly return false.
async function isUsableWineBinary(p) {
  if (!p || typeof p !== 'string') return false
  try {
    await fs.promises.access(p, fs.constants.X_OK)
    return true
  } catch {
    return false
  }
}

// Returns the first usable candidate path, or null if none found.
async function detectWinePath() {
  for (const candidate of CANDIDATE_PATHS) {
    if (await isUsableWineBinary(candidate)) return candidate
  }
  return null
}

// Returns { path, candidates: [{ path, usable }] } — for Settings UI diagnostics.
async function probeCandidates() {
  const candidates = []
  let firstMatch = null
  for (const candidate of CANDIDATE_PATHS) {
    const usable = await isUsableWineBinary(candidate)
    candidates.push({ path: candidate, usable })
    if (usable && !firstMatch) firstMatch = candidate
  }
  return { path: firstMatch, candidates }
}

// Single entry point used by IPC handlers.
// 1. Honors a user-set override if it's still usable.
// 2. Falls back to auto-detection and persists the result.
// 3. Throws with an actionable message if nothing usable is found.
async function resolveWinePath(store) {
  const override = store.get('winePath')
  if (override && (await isUsableWineBinary(override))) {
    return override
  }

  const detected = await detectWinePath()
  if (detected) {
    store.set('winePath', detected)
    return detected
  }

  // Clear the stale override so Settings/UI show "Not detected".
  if (override) store.delete('winePath')

  throw new Error(WINE_NOT_FOUND_MESSAGE)
}

// Non-throwing variant: returns the currently resolvable path or null.
async function getWinePath(store) {
  try {
    return await resolveWinePath(store)
  } catch {
    return null
  }
}

module.exports = {
  CANDIDATE_PATHS,
  WINE_NOT_FOUND_MESSAGE,
  isUsableWineBinary,
  detectWinePath,
  probeCandidates,
  resolveWinePath,
  getWinePath
}
