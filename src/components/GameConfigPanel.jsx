import { useState, useEffect } from 'react'
import useGameStore from '../store/useGameStore'

export default function GameConfigPanel() {
  const selectedGameId = useGameStore((s) => s.selectedGameId)
  const games = useGameStore((s) => s.games)
  const updateGame = useGameStore((s) => s.updateGame)
  const setSelectedGameId = useGameStore((s) => s.setSelectedGameId)
  const runningState = useGameStore((s) => s.runningGames[selectedGameId])

  const game = games.find((g) => g.id === selectedGameId)

  const [arch, setArch] = useState(game?.arch || 'win64')
  const [args, setArgs] = useState(game?.args || '')
  const [envVars, setEnvVars] = useState(
    Object.entries(game?.envVars || {}).map(([k, v]) => ({ key: k, value: v }))
  )
  const [confirmReset, setConfirmReset] = useState(false)

  useEffect(() => {
    if (game) {
      setArch(game.arch)
      setArgs(game.args || '')
      setEnvVars(Object.entries(game.envVars || {}).map(([k, v]) => ({ key: k, value: v })))
    }
  }, [selectedGameId])

  if (!game) return null

  const handleSave = async () => {
    const envObj = {}
    envVars.forEach(({ key, value }) => {
      if (key.trim()) envObj[key.trim()] = value
    })
    await updateGame(game.id, { arch, args: args.trim(), envVars: envObj })
    setSelectedGameId(null)
  }

  const handleResetBottle = async () => {
    await window.api.resetBottle(game)
    setConfirmReset(false)
  }

  const addEnvVar = () => {
    setEnvVars([...envVars, { key: '', value: '' }])
  }

  const removeEnvVar = (index) => {
    setEnvVars(envVars.filter((_, i) => i !== index))
  }

  const updateEnvVar = (index, field, val) => {
    setEnvVars(envVars.map((ev, i) => (i === index ? { ...ev, [field]: val } : ev)))
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedGameId(null)} />
      <div className="relative w-full max-w-sm bg-gray-900 border-l border-gray-800 overflow-y-auto shadow-2xl">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-white">Configure</h3>
            <button
              onClick={() => setSelectedGameId(null)}
              className="p-1 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-gray-200 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mb-4">
            <p className="text-sm font-semibold text-white">{game.name}</p>
            <p className="text-xs text-gray-500 font-mono mt-1 break-all">{game.exePath}</p>
          </div>

          <div className="space-y-5">
            <label className="block">
              <span className="text-xs font-medium text-gray-400 mb-1.5 block">Wine Architecture</span>
              <select
                value={arch}
                onChange={(e) => setArch(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
              >
                <option value="win64">64-bit (win64)</option>
                <option value="win32">32-bit (win32)</option>
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-medium text-gray-400 mb-1.5 block">Extra Wine Args</span>
              <input
                type="text"
                value={args}
                onChange={(e) => setArgs(e.target.value)}
                placeholder="-windowed -nosound"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </label>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-400">Environment Variables</span>
                <button
                  onClick={addEnvVar}
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  + Add
                </button>
              </div>
              <div className="space-y-2">
                {envVars.map((ev, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text"
                      value={ev.key}
                      onChange={(e) => updateEnvVar(i, 'key', e.target.value)}
                      placeholder="KEY"
                      className="w-1/3 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                    <input
                      type="text"
                      value={ev.value}
                      onChange={(e) => updateEnvVar(i, 'value', e.target.value)}
                      placeholder="value"
                      className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                    <button
                      onClick={() => removeEnvVar(i)}
                      className="px-2 text-gray-500 hover:text-red-400 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
                {envVars.length === 0 && (
                  <p className="text-xs text-gray-600">No custom environment variables</p>
                )}
              </div>
            </div>

            <div className="border-t border-gray-800 pt-5 space-y-3">
              <button
                onClick={() => window.api.openBottleFolder(game.bottlePath)}
                className="w-full py-2 rounded-lg border border-gray-700 text-sm text-gray-300 hover:bg-gray-800 transition-colors"
              >
                Open Bottle Folder
              </button>

              {!confirmReset ? (
                <button
                  onClick={() => setConfirmReset(true)}
                  className="w-full py-2 rounded-lg border border-red-900/50 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  Reset Wine Bottle
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleResetBottle}
                    className="flex-1 py-2 rounded-lg bg-red-500/20 text-sm text-red-400 hover:bg-red-500/30 transition-colors"
                  >
                    Confirm Reset
                  </button>
                  <button
                    onClick={() => setConfirmReset(false)}
                    className="flex-1 py-2 rounded-lg border border-gray-700 text-sm text-gray-400 hover:bg-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={() => setSelectedGameId(null)}
              className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-semibold transition-colors"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
