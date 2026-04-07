import { useState } from 'react'

const deps = [
  {
    key: 'wine',
    label: 'Wine',
    description: 'Windows compatibility layer for running .exe files',
    fix: 'brew install wine-stable',
    fixType: 'command',
    required: true
  },
  {
    key: 'rosetta',
    label: 'Rosetta 2',
    description: 'Intel translation layer for Apple Silicon',
    fix: 'softwareupdate --install-rosetta',
    fixType: 'command',
    required: true
  },
  {
    key: 'xquartz',
    label: 'XQuartz',
    description: 'X11 window system (needed by some older games)',
    fix: 'https://www.xquartz.org/',
    fixType: 'link',
    required: false
  }
]

export default function SetupChecker({ status, onRecheck }) {
  const [checking, setChecking] = useState(false)
  const [copied, setCopied] = useState(null)

  const handleRecheck = async () => {
    setChecking(true)
    await onRecheck()
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
        <h2 className="text-2xl font-bold text-white mb-2">System Check</h2>
        <p className="text-gray-400 text-sm mb-8">
          NoWindowsNoProblem needs a few things to run Windows games on your Mac.
        </p>

        <div className="space-y-4 mb-8">
          {deps.map((dep) => {
            const found = status?.[dep.key]
            const loading = status === null

            return (
              <div
                key={dep.key}
                className={`rounded-xl border p-4 ${
                  loading
                    ? 'border-gray-800 bg-gray-900/50'
                    : found
                      ? 'border-green-900/50 bg-green-950/30'
                      : dep.required
                        ? 'border-red-900/50 bg-red-950/30'
                        : 'border-yellow-900/50 bg-yellow-950/30'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {loading ? (
                        <span className="w-2 h-2 rounded-full bg-gray-600 animate-pulse" />
                      ) : found ? (
                        <span className="w-2 h-2 rounded-full bg-green-400" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-red-400" />
                      )}
                      <span className="font-semibold text-sm text-white">{dep.label}</span>
                      {!dep.required && !found && !loading && (
                        <span className="text-xs text-yellow-500 font-medium">Optional</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 ml-4">{dep.description}</p>
                  </div>
                </div>

                {!found && !loading && (
                  <div className="mt-3 ml-4">
                    {dep.fixType === 'command' ? (
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-xs bg-gray-900 text-gray-300 px-3 py-2 rounded-lg font-mono border border-gray-800">
                          {dep.fix}
                        </code>
                        <button
                          onClick={() => copyCommand(dep.fix)}
                          className="text-xs px-3 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
                        >
                          {copied === dep.fix ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                    ) : (
                      <a
                        href={dep.fix}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-indigo-400 hover:text-indigo-300 underline"
                      >
                        Download XQuartz
                      </a>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <button
          onClick={handleRecheck}
          disabled={checking}
          className="w-full py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {checking ? 'Checking...' : 'Re-check Dependencies'}
        </button>
      </div>
    </div>
  )
}
