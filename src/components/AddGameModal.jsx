import { useState, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import useGameStore from '../store/useGameStore'

function nameFromPath(exePath) {
  return exePath
    .split(/[/\\]/)
    .pop()
    .replace(/\.exe$/i, '')
    .replace(/[_-]/g, ' ')
    .trim()
}

export default function AddGameModal() {
  const setShowAddModal = useGameStore((s) => s.setShowAddModal)
  const addGame = useGameStore((s) => s.addGame)
  const pendingExePath = useGameStore((s) => s.pendingExePath)
  const setPendingExePath = useGameStore((s) => s.setPendingExePath)

  const [name, setName] = useState('')
  const [exePath, setExePath] = useState('')
  const [iconPath, setIconPath] = useState('')
  const [arch, setArch] = useState('win64')
  const [args, setArgs] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Pre-populate from pending path (file picker or drag-drop)
  useEffect(() => {
    if (pendingExePath) {
      setExePath(pendingExePath)
      setName(nameFromPath(pendingExePath))
    }
  }, [pendingExePath])

  const changeExe = async () => {
    if (!window.api) return
    const path = await window.api.openFilePicker({
      title: 'Select a Windows executable',
      filters: [{ name: 'Windows Executable', extensions: ['exe'] }]
    })
    if (path) {
      setExePath(path)
      if (!name) setName(nameFromPath(path))
    }
  }

  const browseIcon = async () => {
    if (!window.api) return
    const path = await window.api.openFilePicker({
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }]
    })
    if (path) setIconPath(path)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim() || !exePath.trim() || submitting) return

    setSubmitting(true)
    const id = uuidv4()
    const homeDir = window.api ? await window.api.getHomeDir() : '~'
    const bottlePath = `${homeDir}/NoWindowsNoProblem/bottles/${id}`

    await addGame({
      id,
      name: name.trim(),
      exePath: exePath.trim(),
      bottlePath,
      iconPath: iconPath || null,
      args: args.trim(),
      arch,
      envVars: {},
      createdAt: new Date().toISOString()
    })

    setPendingExePath(null)
    setShowAddModal(false)
  }

  const close = () => {
    setPendingExePath(null)
    setShowAddModal(false)
  }

  const canSubmit = name.trim() && exePath.trim() && !submitting

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md shadow-2xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-800">
          <h3 className="text-base font-bold text-white">Add Game</h3>
          <button
            onClick={close}
            className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-gray-200 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Box art + name row */}
          <div className="flex gap-4 items-start">
            {/* Box art thumbnail */}
            <button
              type="button"
              onClick={browseIcon}
              title="Click to select box art"
              className="flex-shrink-0 w-16 h-20 rounded-lg border-2 border-dashed border-gray-700 hover:border-indigo-500/50 bg-gray-800 hover:bg-gray-750 transition-colors overflow-hidden flex items-center justify-center group"
            >
              {iconPath ? (
                <img
                  src={`file://${iconPath}`}
                  alt="Box art"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center">
                  {name ? (
                    <span className="text-xl font-bold text-gray-500 group-hover:text-gray-400">
                      {name.charAt(0).toUpperCase()}
                    </span>
                  ) : (
                    <svg className="w-5 h-5 text-gray-600 group-hover:text-gray-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                    </svg>
                  )}
                  <span className="block text-[9px] text-gray-600 group-hover:text-gray-500 mt-1">Art</span>
                </div>
              )}
            </button>

            {/* Game name */}
            <div className="flex-1">
              <label className="block">
                <span className="text-xs font-medium text-gray-400 mb-1.5 block">
                  Game Name <span className="text-red-400">*</span>
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Fallout New Vegas"
                  autoFocus
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </label>
            </div>
          </div>

          {/* Exe path — read-only + Change */}
          <div>
            <label className="text-xs font-medium text-gray-400 mb-1.5 block">
              Executable <span className="text-red-400">*</span>
            </label>
            <div className="flex gap-2">
              <div className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-400 font-mono truncate">
                {exePath || <span className="text-gray-600">No file selected</span>}
              </div>
              <button
                type="button"
                onClick={changeExe}
                className="flex-shrink-0 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 text-sm hover:bg-gray-700 transition-colors"
              >
                {exePath ? 'Change' : 'Browse'}
              </button>
            </div>
          </div>

          {/* Arch + Extra args */}
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-medium text-gray-400 mb-1.5 block">Wine Arch</span>
              <select
                value={arch}
                onChange={(e) => setArch(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
              >
                <option value="win64">win64 (64-bit)</option>
                <option value="win32">win32 (32-bit)</option>
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-medium text-gray-400 mb-1.5 block">Extra Args</span>
              <input
                type="text"
                value={args}
                onChange={(e) => setArgs(e.target.value)}
                placeholder="--no-sandbox"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={close}
              className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="px-5 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? 'Adding...' : 'Add Game'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
