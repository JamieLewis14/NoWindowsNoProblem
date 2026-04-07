import { useState, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import useGameStore from '../store/useGameStore'

export default function AddGameModal() {
  const setShowAddModal = useGameStore((s) => s.setShowAddModal)
  const addGame = useGameStore((s) => s.addGame)
  const droppedPath = useGameStore((s) => s._droppedExePath)

  const [name, setName] = useState('')
  const [exePath, setExePath] = useState(droppedPath || '')
  const [iconPath, setIconPath] = useState('')
  const [arch, setArch] = useState('win64')
  const [args, setArgs] = useState('')

  useEffect(() => {
    if (droppedPath) {
      const filename = droppedPath.split('/').pop().replace('.exe', '')
      setName(filename)
      setExePath(droppedPath)
      useGameStore.setState({ _droppedExePath: null })
    }
  }, [droppedPath])

  const handleBrowseExe = async () => {
    const path = await window.api.openFilePicker({
      filters: [{ name: 'Executables', extensions: ['exe'] }]
    })
    if (path) {
      setExePath(path)
      if (!name) {
        setName(path.split('/').pop().replace('.exe', ''))
      }
    }
  }

  const handleBrowseIcon = async () => {
    const path = await window.api.openFilePicker({
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }]
    })
    if (path) setIconPath(path)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim() || !exePath.trim()) return

    const id = uuidv4()
    const homeDir = await window.api.getHomeDir()
    const bottlePath = `${homeDir}/NoWindowsNoProblem/bottles/${id}`

    const game = {
      id,
      name: name.trim(),
      exePath: exePath.trim(),
      bottlePath,
      iconPath: iconPath || null,
      args: args.trim(),
      arch,
      envVars: {},
      createdAt: new Date().toISOString()
    }

    await addGame(game)
    setShowAddModal(false)
  }

  const close = () => {
    useGameStore.setState({ _droppedExePath: null })
    setShowAddModal(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 pt-5 pb-0">
          <h3 className="text-lg font-bold text-white">Add Game</h3>
          <button
            onClick={close}
            className="p-1 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-gray-200 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <Field label="Game Name" required>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Fallout New Vegas"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </Field>

          <Field label="Executable Path" required>
            <div className="flex gap-2">
              <input
                type="text"
                value={exePath}
                onChange={(e) => setExePath(e.target.value)}
                placeholder="/path/to/game.exe"
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors font-mono text-xs"
              />
              <button
                type="button"
                onClick={handleBrowseExe}
                className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 text-sm hover:bg-gray-700 transition-colors"
              >
                Browse
              </button>
            </div>
          </Field>

          <Field label="Box Art (optional)">
            <div className="flex gap-2">
              <input
                type="text"
                value={iconPath}
                readOnly
                placeholder="No image selected"
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-400 placeholder-gray-500 font-mono text-xs"
              />
              <button
                type="button"
                onClick={handleBrowseIcon}
                className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 text-sm hover:bg-gray-700 transition-colors"
              >
                Browse
              </button>
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Wine Arch">
              <select
                value={arch}
                onChange={(e) => setArch(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
              >
                <option value="win64">64-bit (win64)</option>
                <option value="win32">32-bit (win32)</option>
              </select>
            </Field>

            <Field label="Extra Args">
              <input
                type="text"
                value={args}
                onChange={(e) => setArgs(e.target.value)}
                placeholder="-windowed"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </Field>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={close}
              className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || !exePath.trim()}
              className="px-5 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Add Game
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, required, children }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-gray-400 mb-1.5 block">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </span>
      {children}
    </label>
  )
}
