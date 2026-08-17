import { useMemo, useState } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'

const PAGE_SIZE = 10

export default function DataTable({ columns, data, onRowClick }) {
  const [sort, setSort] = useState({ key: null, dir: 'asc' })
  const [page, setPage] = useState(0)

  const sorted = useMemo(() => {
    if (!sort.key) return data
    const copy = [...data]
    copy.sort((a, b) => {
      const av = a[sort.key]
      const bv = b[sort.key]
      if (av === bv) return 0
      const result = av > bv ? 1 : -1
      return sort.dir === 'asc' ? result : -result
    })
    return copy
  }, [data, sort])

  const pageCount = Math.ceil(sorted.length / PAGE_SIZE) || 1
  const pageData = sorted.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)

  function toggleSort(key) {
    setSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }
    )
  }

  return (
    <div className="bg-white rounded-xl border border-paper-line shadow-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-paper-line bg-paper-soft/60">
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => col.sortable !== false && toggleSort(col.key)}
                  className={`px-4 py-3 text-right font-medium text-ink-500 whitespace-nowrap ${
                    col.sortable !== false ? 'cursor-pointer select-none' : ''
                  }`}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {sort.key === col.key &&
                      (sort.dir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.map((row, i) => (
              <tr
                key={row.id ?? i}
                onClick={() => onRowClick?.(row)}
                className={`h-11 border-b border-paper-line last:border-0 ${
                  i % 2 === 1 ? 'bg-paper-soft/40' : ''
                } ${onRowClick ? 'cursor-pointer hover:bg-brass-100/30' : ''}`}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-2.5 text-ink-700 whitespace-nowrap">
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pageCount > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-paper-line text-sm text-ink-400">
          <span>
            صفحة {page + 1} من {pageCount}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="px-3 py-1 rounded-lg border border-paper-line disabled:opacity-40 hover:bg-paper-soft"
            >
              السابق
            </button>
            <button
              disabled={page >= pageCount - 1}
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              className="px-3 py-1 rounded-lg border border-paper-line disabled:opacity-40 hover:bg-paper-soft"
            >
              التالي
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
