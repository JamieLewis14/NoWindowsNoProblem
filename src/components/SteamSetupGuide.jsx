import { useState, useEffect } from 'react'
import useGameStore from '../store/useGameStore'

export default function SteamSetupGuide() {
  const setShowSteamSetup = useGameStore((s) => s.setShowSteamSetup)
  const showToast = useGameStore((s) => s.showToast)

  const [steamStatus, setSteamStatus] = useState(null)
  const [installerPath, setInstallerPath] = useState('')
  const [installing, setInstalling] = useState(false)
  const [launching, setLaunching] = useState(false)
  const [step, setStep] = useState(1) // 1 = download, 2 = select, 3 = install, 4 = launch

  const refreshStatus = async () => {
    if (!window.api) return
    const status = await window.api.getSteamStatus()
    setSteamStatus(status)
    // Auto-advance to the launch step once installed
    if (status.installed && step < 4) setStep(4)
  }

  useEffect(() => {
    refreshStatus()
  }, [])

  const browseInstaller = async () => {
    if (!window.api) return
    const picked = await window.api.openFilePicker({
      title: 'Select SteamSetup.exe',
      filters: [{ name: 'Steam Installer', extensions: ['exe'] }]
    })
    if (picked) {
      setInstallerPath(picked)
      if (step < 3) setStep(3)
    }
  }

  const handleInstall = async () => {
    if (!installerPath || !window.api) return
    setInstalling(true)
    try {
      await window.api.installSteam(installerPath)
      await refreshStatus()
      setStep(4)
    } catch (err) {
      showToast(`Steam install failed: ${err.message || err}`)
    } finally {
      setInstalling(false)
    }
  }

  const handleLaunchSteam = async () => {
    if (!window.api) return
    setLaunching(true)
    try {
      await window.api.launchSteamOnly()
      await refreshStatus()
    } catch (err) {
      showToast(`Failed to launch Steam: ${err.message || err}`)
    } finally {
      setLaunching(false)
    }
  }

  const close = () => setShowSteamSetup(false)

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg shadow-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-800 sticky top-0 bg-gray-900 z-10">
          <div>
            <h3 className="text-base font-bold text-white">Steam Setup</h3>
            <p className="text-xs text-gray-500 mt-0.5">Install Steam into the shared Wine bottle</p>
          </div>
          <button
            onClick={close}
            className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-gray-200 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Reality check banner */}
        <div className="mx-6 mt-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-xs text-yellow-200 leading-relaxed">
          <strong className="block mb-1">Heads up</strong>
          Steam's web UI (store, friends, chat) is built on Chromium and often crashes under Wine. If you see "steamwebhelper is not responding", use <code className="px-1 py-0.5 bg-yellow-500/20 rounded">View &gt; Small Mode</code> to switch to the legacy non-web UI. Games themselves usually run fine even when Steam's UI is limited.
        </div>

        {/* Status */}
        {steamStatus && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-gray-800/50 border border-gray-800 text-xs text-gray-300 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Installed:</span>
              <span className={steamStatus.installed ? 'text-green-400' : 'text-gray-400'}>
                {steamStatus.installed ? 'Yes' : 'Not yet'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Running:</span>
              <span className={steamStatus.running ? 'text-green-400' : 'text-gray-400'}>
                {steamStatus.running ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
        )}

        {/* Steps */}
        <div className="p-6 space-y-5">
          {/* Step 1: Download */}
          <Step number={1} active={step === 1} done={step > 1}>
            <StepTitle>Download SteamSetup.exe</StepTitle>
            <StepBody>
              Go to <code className="px-1 py-0.5 bg-gray-800 rounded text-gray-300">store.steampowered.com/about</code> in your browser and download the Windows installer. Come back here when you have <code className="px-1 py-0.5 bg-gray-800 rounded text-gray-300">SteamSetup.exe</code> saved.
            </StepBody>
            {step === 1 && (
              <button
                onClick={() => setStep(2)}
                className="mt-2 px-3 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-medium transition-colors"
              >
                I have the installer
              </button>
            )}
          </Step>

          {/* Step 2: Select */}
          <Step number={2} active={step === 2} done={step > 2}>
            <StepTitle>Select SteamSetup.exe</StepTitle>
            <StepBody>Point the app at the installer you downloaded.</StepBody>
            {installerPath && (
              <div className="mt-2 text-[10px] text-gray-500 font-mono truncate">{installerPath}</div>
            )}
            {(step === 2 || !installerPath) && (
              <button
                onClick={browseInstaller}
                className="mt-2 px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 hover:bg-gray-700 text-gray-200 text-xs font-medium transition-colors"
              >
                {installerPath ? 'Change file' : 'Browse...'}
              </button>
            )}
          </Step>

          {/* Step 3: Install */}
          <Step number={3} active={step === 3} done={steamStatus?.installed}>
            <StepTitle>Install Steam</StepTitle>
            <StepBody>
              This creates the shared Steam bottle, applies Windows 10 registry settings, and runs the installer under Wine. The Steam installer window will open.
            </StepBody>
            {step >= 3 && !steamStatus?.installed && (
              <button
                onClick={handleInstall}
                disabled={!installerPath || installing}
                className="mt-2 px-3 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {installing ? 'Installing...' : 'Run installer'}
              </button>
            )}
          </Step>

          {/* Step 4: Launch & Log in */}
          <Step number={4} active={step === 4} done={false}>
            <StepTitle>Launch Steam and log in</StepTitle>
            <StepBody>
              Launches Steam with <code className="px-1 py-0.5 bg-gray-800 rounded text-gray-300">-no-cef-sandbox</code>. Log into your account in the Wine window. Then install Master Duel (or your game) from Steam's library. When the game is installed, close this guide and add it via "Add Game".
            </StepBody>
            {step >= 4 && (
              <button
                onClick={handleLaunchSteam}
                disabled={launching || !steamStatus?.installed}
                className="mt-2 px-3 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {launching ? 'Launching...' : steamStatus?.running ? 'Steam is running' : 'Launch Steam'}
              </button>
            )}
          </Step>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-2 flex justify-end gap-3 border-t border-gray-800">
          <button
            onClick={close}
            className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-gray-200 transition-colors"
          >
            Close
          </button>
          <button
            onClick={refreshStatus}
            className="px-4 py-2 rounded-lg border border-gray-700 text-sm text-gray-300 hover:bg-gray-800 transition-colors"
          >
            Refresh status
          </button>
        </div>
      </div>
    </div>
  )
}

function Step({ number, active, done, children }) {
  return (
    <div className={`flex gap-3 ${done ? 'opacity-60' : ''}`}>
      <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
        done
          ? 'bg-green-500/20 text-green-400'
          : active
            ? 'bg-indigo-500 text-white'
            : 'bg-gray-800 text-gray-500'
      }`}>
        {done ? (
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          number
        )}
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}

function StepTitle({ children }) {
  return <h4 className="text-sm font-semibold text-white mb-1">{children}</h4>
}

function StepBody({ children }) {
  return <p className="text-xs text-gray-400 leading-relaxed">{children}</p>
}
