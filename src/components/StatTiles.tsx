import type { ThemeRow } from '../lib/supabase'
import { themeLabel } from '../lib/taxonomy'

type Props = { rows: ThemeRow[] }

export function StatTiles({ rows }: Props) {
  const total = rows.reduce((n, r) => n + Number(r.total), 0)
  const negative = rows.reduce((n, r) => n + Number(r.negative), 0)
  const negativeShare = total > 0 ? Math.round((negative / total) * 100) : 0
  const topNegative = rows.find((r) => Number(r.negative) > 0)
  const unclassified = rows.find((r) => r.theme === 'other')
  const otherShare = total > 0 && unclassified ? Math.round((Number(unclassified.total) / total) * 100) : 0

  return (
    <div className="tiles">
      <div className="tile">
        <span className="tile-label">Total classified</span>
        <span className="tile-value">{total}</span>
        <span className="tile-sub">
          across {rows.length} theme{rows.length === 1 ? '' : 's'} · {otherShare}% unclassified
        </span>
      </div>

      <div className="tile">
        <span className="tile-label">Negative dissatisfaction</span>
        <span className="tile-value neg">{negativeShare}%</span>
        <span className="tile-sub">
          {negative} of {total} items
        </span>
      </div>

      <div className="tile tile-accent">
        <span className="tile-label">Top complaint driver</span>
        <span className="tile-value tile-value-sm">
          {topNegative ? themeLabel(topNegative.theme) : 'None'}
        </span>
        <span className="tile-sub accent">
          {topNegative
            ? `Primary root-cause for CX handover · ${topNegative.negative} complaint${Number(topNegative.negative) === 1 ? '' : 's'}`
            : 'No negative feedback in this view'}
        </span>
      </div>
    </div>
  )
}
