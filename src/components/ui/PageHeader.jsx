import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'

export default function PageHeader({ title, breadcrumb, actions }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        {breadcrumb && (
          <div className="flex items-center gap-1 text-xs text-ink-400 mb-1">
            {breadcrumb.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronLeft size={11} />}
                {crumb.to ? (
                  <Link to={crumb.to} className="hover:text-brass-600">
                    {crumb.label}
                  </Link>
                ) : (
                  <span>{crumb.label}</span>
                )}
              </span>
            ))}
          </div>
        )}
        <h1 className="text-2xl font-display font-bold text-ink-800">{title}</h1>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
