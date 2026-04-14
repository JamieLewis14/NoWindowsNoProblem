import { useState, useEffect } from 'react'
import useGameStore from '../store/useGameStore'

export default function GameConfigPanel() {
  const selectedGameId = useGameStore((s) => s.selectedGameId)
  const games = useGameStore((s) => s.games)
  const updateGame = useGameStore((s) => s.updateGame)
  const setSelectedGameId = useGameStore((s) => s.setSelectedGameId)
  const setRunningState = useGameStore((s) => s.setRunningState)

  const game = games.find((g) => g.id === selectedGameId)

  const [name, setName] = useState(game?.name || '')
  const [exePath, setExePath] = useState(game?.exePath || '')
  const [arch, setArch] = useState(game?.arch || 'win64')
  const [args, setArgs] = useState(game?.args || '')
  const [envVars, setEnvVars] = useState(
    Object.entries(game?.envVars || {}).map(([k, v]) => ({ key: k, value: v }))
  )
  const [confirmReset, setConfirmReset] = useState(false)

  useEffect(() => {
    if (game) {
      setName(game.name)
      setExePath(game.exePath)
      setArch(game.arch)
      setArgs(game.args || '')
      setEnvVars(Object.entries(game.envVars || {}).map(([k, v]) => ({ key: k, value: v })))
    }
  }, [selectedGameId])

  if (!game) return null

  const close = () => setSelectedGameId(null)

  const handleSave = async () => {
    const envObj = {}
    envVars.forEach(({ key, value }) => {
      if (key.trim()) envObj[key.trim()] = value
    })
    await updateGame(game.id, {
      name: name.trim() || game.name,
      exePath,
      arch,
      args: args.trim(),
      envVars: envObj
    })
    close()
  }

  const changeExe = async () => {
    if (!window.api) return
    const path = await window.api.openFilePicker({
      title: 'Select a Windows executable',
      filters: [{ name: 'Windows Executable', extensions: ['exe'] }]
    })
    if (path) setExePath(path)
  }

  const handleResetBottle = async () => {
    if (window.api) await window.api.resetBottle(game)
    setRunningState(game.id, 'stopped')
    setConfirmReset(false)
  }

  const addEnvVar = () => setEnvVars([...envVars, { key: '', value: '' }])
  const removeEnvVar = (i) => setEnvVars(envVars.filter((_, idx) => idx !== i))
  const updateEnvVar = (i, field, val) => setEnvVars(envVars.map((ev, idx) => idx === i ? { ...ev, [field]: val } : ev))

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={close} />
      <div className="relative w-full max-w-sm bg-gray-900 border-l border-gray-800 overflow-y-auto shadow-2xl">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-white">Configure</h3>
            <button onClick={close} className="p-1 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-gray-200 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-5">
            {/* Name */}
            <label className="block">
              <span className="text-xs font-medium text-gray-400 mb-1.5 block">Game Name</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </label>

            {/* Exe path */}
            <div>
              <span className="text-xs font-medium text-gray-400 mb-1.5 block">Executable Path</span>
              <div className="flex gap-2">
                <div className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-400 font-mono truncate">
                  {exePath}
                </div>
                <button
                  type="button"
                  onClick={changeExe}
                  className="flex-shrink-0 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 text-sm hover:bg-gray-700 transition-colors"
                >
                  Change
                </button>
              </div>
            </div>

            {/* Arch */}
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

            {/* Args */}
            <label className="block">
              <span className="text-xs font-medium text-gray-400 mb-1.5 block">Extra Wine Args</span>
              <input
                type="text"
                value={args}
                onChange={(e) => setArgs(e.target.value)}
                placeholder="--no-sandbox"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </label>

            {/* Env vars */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-400">Environment Variables</span>
                <button onClick={addEnvVar} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">+ Add</button>
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
                    <button onClick={() => removeEnvVar(i)} className="px-2 text-gray-500 hover:text-red-400 transition-colors">
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

            {/* Actions */}
            <div className="border-t border-gray-800 pt-5 space-y-3">
              <button
                onClick={() => window.api?.openBottleFolder(game.bottlePath)}
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
                <div className="space-y-2">
                  <p className="text-xs text-gray-400">This will delete the Wine environment for this game. Are you sure?</p>
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
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button onClick={close} className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-gray-200 transition-colors">
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
