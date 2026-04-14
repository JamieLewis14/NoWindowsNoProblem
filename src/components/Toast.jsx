import useGameStore from '../store/useGameStore'

export default function Toast({ message, type }) {
  const dismissToast = useGameStore((s) => s.dismissToast)

  return (
    <div className="fixed top-6 right-6 z-[60] max-w-sm animate-fade-in">
      <div
        className={`flex items-start gap-3 px-4 py-3 rounded-xl border shadow-xl backdrop-blur-sm ${
          type === 'error'
            ? 'bg-red-950/80 border-red-900/50 text-red-200'
            : 'bg-gray-900/90 border-gray-700 text-gray-200'
        }`}
      >
        {type === 'error' && (
          <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        )}
        <p className="text-sm flex-1">{message}</p>
        <button
          onClick={dismissToast}
          className="p-0.5 rounded hover:bg-white/10 text-gray-400 hover:text-gray-200 transition-colors flex-shrink-0"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
