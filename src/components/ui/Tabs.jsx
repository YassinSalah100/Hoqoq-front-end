export default function Tabs({ tabs, active, onChange }) {
  return (
    <div className="flex items-center gap-1 border-b border-paper-line overflow-x-auto">
      {tabs.map((tab) => {
        const isActive = tab.value === active
        return (
          <button
            key={tab.value}
            onClick={() => onChange(tab.value)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              isActive
                ? 'border-brass-500 text-brass-700'
                : 'border-transparent text-ink-500 hover:text-ink-800'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={`px-1.5 py-0.5 rounded-full text-xs ${
                  isActive ? 'bg-brass-100 text-brass-700' : 'bg-paper-soft text-ink-400'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
