import * as Icons from 'lucide-react'

const ACCENTS = {
  gold: { bg: 'bg-brass-100', icon: 'text-brass-600' },
  rust: { bg: 'bg-rust-100', icon: 'text-rust-600' },
  ink: { bg: 'bg-ink-100', icon: 'text-ink-600' },
}

export default function StatCard({ label, value, trend, icon, accent = 'gold' }) {
  const Icon = Icons[icon] ?? Icons.Circle
  const style = ACCENTS[accent] ?? ACCENTS.gold
  return (
    <div className="bg-white rounded-xl p-6 shadow-card border border-paper-line">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm text-ink-400 mb-1">{label}</p>
          <p className="text-4xl font-bold text-ink-800 font-mono">{value}</p>
          {trend && <p className="text-xs text-ink-300 mt-1">{trend}</p>}
        </div>
        <div className={`p-3 rounded-xl ${style.bg}`}>
          <Icon size={18} className={style.icon} />
        </div>
      </div>
    </div>
  )
}
