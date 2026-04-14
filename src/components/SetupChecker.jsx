import { useState, useEffect } from 'react'

const DEPS = [
  {
    key: 'wine',
    label: 'Wine',
    description: 'Windows compatibility layer for running .exe files',
    fix: 'brew install --cask gcenx/wine/wine-stable',
    fixType: 'command',
    required: true
  },
  {
    key: 'rosetta',
    label: 'Rosetta 2',
    description: 'Intel x86 translation layer for Apple Silicon',
    fix: 'softwareupdate --install-rosetta',
    fixType: 'command',
    required: true
  },
  {
    key: 'xquartz',
    label: 'XQuartz',
    description: 'X11 window system — needed by some older games',
    fix: 'https://www.xquartz.org/',
    fixType: 'link',
    required: false
  }
]

export default function SetupChecker({ status, isSettingsMode, onRecheck, onContinue, onRecheckAndRegate }) {
  const [checking, setChecking] = useState(false)
  const [continuing, setContinuing] = useState(false)
  const [copied, setCopied] = useState(null)
  const [winePath, setWinePath] = useState(null)
  const [probe, setProbe] = useState(null)
  const [winePathError, setWinePathError] = useState(null)
  const [busy, setBusy] = useState(false)

  const wineOk = status?.wine === true
  const loading = status === null

  // Refresh the resolved wine path whenever status changes.
  useEffect(() => {
    if (!window.api?.getWinePath) return
    window.api.getWinePath().then(setWinePath)
  }, [status])

  const refreshWinePath = async () => {
    if (!window.api?.getWinePath) return
    const p = await window.api.getWinePath()
    setWinePath(p)
  }

  const handleAutoDetect = async () => {
    if (!window.api?.detectWinePath) return
    setBusy(true)
    setWinePathError(null)
    try {
      const result = await window.api.detectWinePath()
      setProbe(result)
      await refreshWinePath()
      await onRecheck()
    } finally {
      setBusy(false)
    }
  }

  const handleChangeWinePath = async () => {
    if (!window.api?.openFilePicker || !window.api?.setWinePath) return
    const picked = await window.api.openFilePicker({
      title: 'Select Wine binary'
    })
    if (!picked) return
    setBusy(true)
    setWinePathError(null)
    try {
      await window.api.setWinePath(picked)
      setProbe(null)
      await refreshWinePath()
      await onRecheck()
    } catch (err) {
      setWinePathError(err.message || String(err))
    } finally {
      setBusy(false)
    }
  }

  const handleRecheck = async () => {
    setChecking(true)
    await onRecheck()
    setChecking(false)
  }

  const handleContinue = async () => {
    setContinuing(true)
    await onContinue()
    setContinuing(false)
  }

  const handleRegate = async () => {
    setChecking(true)
    await onRecheckAndRegate()
    setChecking(false)
  }

  const copyCommand = (cmd) => {
    navigator.clipboard.writeText(cmd)
    setCopied(cmd)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-lg w-full">
        {isSettingsMode ? (
          <>
            <h2 className="text-2xl font-bold text-white mb-1">Settings</h2>
            <p className="text-gray-400 text-sm mb-8">Check your Wine setup and re-gate if something is broken.</p>
          </>
        ) : (
          <>
            <div className="mb-2">
              <span className="text-xs font-semibold tracking-widest text-indigo-400 uppercase">Getting Started</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-1">System Check</h2>
            <p className="text-gray-400 text-sm mb-8">
              NoWindowsNoProblem needs a few things installed before you can run Windows games.
            </p>
          </>
        )}

        <div className="space-y-3 mb-8">
          {DEPS.map((dep) => {
            const found = status?.[dep.key]

            return (
              <div
                key={dep.key}
                className={`rounded-xl border p-4 transition-colors ${
                  loading
                    ? 'border-gray-800 bg-gray-900/50'
                    : found
                      ? 'border-green-900/40 bg-green-950/20'
                      : dep.required
                        ? 'border-red-900/40 bg-red-950/20'
                        : 'border-yellow-900/40 bg-yellow-950/20'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex-shrink-0">
                    {loading ? (
                      <span className="flex w-4 h-4 items-center justify-center">
                        <span className="w-2 h-2 rounded-full bg-gray-600 animate-pulse" />
                      </span>
                    ) : found ? (
                      <span className="flex w-4 h-4 items-center justify-center text-green-400">
                        <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
                          <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 010 1.06l-5.5 5.5a.75.75 0 01-1.06 0l-2.5-2.5a.75.75 0 011.06-1.06l1.97 1.97 4.97-4.97a.75.75 0 011.06 0z" clipRule="evenodd" />
                        </svg>
                      </span>
                    ) : (
                      <span className="flex w-4 h-4 items-center justify-center text-red-400">
                        <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
                          <path fillRule="evenodd" d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" clipRule="evenodd" />
                        </svg>
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold text-sm text-white">{dep.label}</span>
                      {!dep.required && (
                        <span className="text-[10px] font-semibold tracking-wide text-yellow-500/80 uppercase">Optional</span>
                      )}
                      {found && (
                        <span className="text-[10px] font-semibold tracking-wide text-green-400/80 uppercase">Found</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">{dep.description}</p>

                    {!found && !loading && (
                      <div className="mt-2.5">
                        {dep.fixType === 'command' ? (
                          <div className="flex items-center gap-2">
                            <code className="flex-1 text-xs bg-gray-950 text-gray-300 px-3 py-1.5 rounded-lg font-mono border border-gray-800 truncate">
                              {dep.fix}
                            </code>
                            <button
                              onClick={() => copyCommand(dep.fix)}
                              className="flex-shrink-0 text-xs px-3 py-1.5 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
                            >
                              {copied === dep.fix ? 'Copied!' : 'Copy'}
                            </button>
                          </div>
                        ) : (
                          <a
                            href={dep.fix}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
                          >
                            Download XQuartz →
                          </a>
                        )}
                      </div>
                    )}

                    {dep.key === 'wine' && !loading && (
                      <div className="mt-3 pt-3 border-t border-gray-800/60 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="text-[10px] font-semibold tracking-wide text-gray-500 uppercase mb-0.5">
                              Current Wine Path
                            </div>
                            <div className="text-xs font-mono text-gray-300 truncate">
                              {winePath || <span className="text-gray-500">Not detected</span>}
                            </div>
                          </div>
                          <div className="flex flex-shrink-0 gap-1.5">
                            <button
                              onClick={handleAutoDetect}
                              disabled={busy}
                              className="text-xs px-2.5 py-1 rounded-md bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Auto-detect
                            </button>
                            <button
                              onClick={handleChangeWinePath}
                              disabled={busy}
                              className="text-xs px-2.5 py-1 rounded-md bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Change...
                            </button>
                          </div>
                        </div>

                        {winePathError && (
                          <p className="text-xs text-red-400">{winePathError}</p>
                        )}

                        {probe && !probe.path && (
                          <div className="text-[11px] text-gray-500">
                            <div className="mb-1">No Wine binary found. Checked paths:</div>
                            <ul className="space-y-0.5 font-mono">
                              {probe.candidates.map((c) => (
                                <li key={c.path} className="flex items-center gap-1.5">
                                  <span className={c.usable ? 'text-green-400' : 'text-red-500/70'}>
                                    {c.usable ? '✓' : '✗'}
                                  </span>
                                  <span className="truncate">{c.path}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex flex-col gap-3">
          {isSettingsMode ? (
            <button
              onClick={handleRegate}
              disabled={checking}
              className="w-full py-2.5 rounded-xl border border-gray-700 text-white text-sm font-semibold transition-colors hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {checking ? 'Checking...' : 'Re-check & Re-gate on Next Launch'}
            </button>
          ) : (
            <>
              <button
                onClick={handleRecheck}
                disabled={checking}
                className="w-full py-2.5 rounded-xl border border-gray-700 text-gray-300 text-sm font-medium transition-colors hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {checking ? 'Checking...' : 'Re-check'}
              </button>

              <button
                onClick={handleContinue}
                disabled={!wineOk || continuing}
                className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  wineOk
                    ? 'bg-indigo-500 hover:bg-indigo-400 text-white shadow-lg shadow-indigo-500/20'
                    : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                }`}
              >
                {continuing
                  ? 'Loading...'
                  : wineOk
                    ? 'Continue to Library →'
                    : 'Install Wine to continue'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
