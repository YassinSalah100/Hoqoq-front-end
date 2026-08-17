import { Search } from 'lucide-react'

export default function SearchInput({ placeholder = 'بحث...', className = '', ...props }) {
  return (
    <div className={`relative ${className}`}>
      <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-300" />
      <input
        type="text"
        placeholder={placeholder}
        className="w-full rounded-lg border border-paper-line bg-white py-2 pr-9 pl-3 text-sm text-ink-800 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-brass-500/30 focus:border-brass-500"
        {...props}
      />
    </div>
  )
}
