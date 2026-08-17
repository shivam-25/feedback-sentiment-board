import { useState } from 'react'
import { fetchItemsForTheme, type FeedbackItem, type ThemeRow } from '../lib/supabase'
import { SENTIMENT_LABELS, themeLabel } from '../lib/taxonomy'

type Props = {
  rows: ThemeRow[]
  runId: string | null
}

type DrillState = {
  items: FeedbackItem[]
  loading: boolean
  error: string | null
}

export function ThemeTable({ rows, runId }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [drill, setDrill] = useState<Record<string, DrillState>>({})

  const maxTotal = Math.max(1, ...rows.map((r) => Number(r.total)))

  async function toggle(theme: string) {
    if (expanded === theme) {
      setExpanded(null)
      return
    }
    setExpanded(theme)

    // Cache per theme+scope so re-expanding does not re-query.
    const key = `${theme}:${runId ?? 'all'}`
    if (drill[key]) return

    setDrill((d) => ({ ...d, [key]: { items: [], loading: true, error: null } }))
    try {
      const items = await fetchItemsForTheme(theme, runId)
      setDrill((d) => ({ ...d, [key]: { items, loading: false, error: null } }))
    } catch (err) {
      setDrill((d) => ({
        ...d,
        [key]: { items: [], loading: false, error: err instanceof Error ? err.message : 'Could not load feedback.' },
      }))
    }
  }

  return (
    <div className="theme-table">
      <div className="theme-head">
        <span>Theme</span>
        <span className="num">Negative</span>
        <span className="num">Total</span>
      </div>

      {rows.map((row) => {
        const key = `${row.theme}:${runId ?? 'all'}`
        const state = drill[key]
        const isOpen = expanded === row.theme
        const total = Number(row.total)
        const negative = Number(row.negative)
        const negShare = total > 0 ? Math.round((negative / total) * 100) : 0

        return (
          <div key={row.theme} className={`theme-row-wrap${isOpen ? ' open' : ''}`}>
            <button
              className="theme-row"
              onClick={() => toggle(row.theme)}
              aria-expanded={isOpen}
              aria-controls={`drill-${row.theme}`}
            >
              <span className="theme-name">
                <span className={`chevron${isOpen ? ' open' : ''}`} aria-hidden="true">›</span>
                <span className={row.theme === 'other' ? 'unclassified' : ''}>{themeLabel(row.theme)}</span>
              </span>

              <span className="bar-cell">
                <span className="bar-track">
                  <span className="bar-fill neg" style={{ width: `${(negative / maxTotal) * 100}%` }} />
                  <span className="bar-fill rest" style={{ width: `${((total - negative) / maxTotal) * 100}%` }} />
                </span>
              </span>

              <span className="num strong">{negative}</span>
              <span className="num muted">{total}</span>
            </button>

            {isOpen && (
              <div className="drill" id={`drill-${row.theme}`}>
                <p className="drill-meta">
                  {negShare}% of {total} item{total === 1 ? '' : 's'} in this theme are negative. Showing the original
                  customer text so every count above can be verified.
                </p>

                {state?.loading && <p className="drill-status">Loading feedback…</p>}
                {state?.error && <p className="drill-status error">{state.error}</p>}

                {state && !state.loading && !state.error && state.items.length === 0 && (
                  <p className="drill-status">No items found for this theme in the current view.</p>
                )}

                {state?.items.map((item) => (
                  <div className="verbatim" key={item.id}>
                    <span className={`chip chip-${item.sentiment}`}>
                      {SENTIMENT_LABELS[item.sentiment] ?? item.sentiment}
                    </span>
                    <div className="verbatim-body">
                      <p className="verbatim-text">{item.raw_text}</p>
                      {item.summary && <p className="verbatim-summary">{item.summary}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
