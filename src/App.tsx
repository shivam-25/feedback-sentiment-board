import { useCallback, useEffect, useMemo, useState } from 'react'
import { InputPanel } from './components/InputPanel'
import { StatTiles } from './components/StatTiles'
import { ThemeTable } from './components/ThemeTable'
import { Banner } from './components/Banner'
import { parseFeedback } from './lib/parse'
import { analyze } from './lib/api'
import { configError, fetchBoard, fetchRuns, type RunRow, type ThemeRow } from './lib/supabase'
import { batchText, type SampleBatch } from './data/sample'
import { importFile, ImportError, toTextarea } from './lib/fileImport'
import { MAX_ITEMS } from './lib/parse'

type Scope = 'run' | 'all'

const REPO_URL = 'https://github.com/shivam-25/feedback-sentiment-board'

export default function App() {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<{ title: string; detail: string } | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [loadedBatchId, setLoadedBatchId] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)

  const [scope, setScope] = useState<Scope>('all')
  const [latestRunId, setLatestRunId] = useState<string | null>(null)
  const [runs, setRuns] = useState<RunRow[]>([])
  const [rows, setRows] = useState<ThemeRow[]>([])
  const [loadingBoard, setLoadingBoard] = useState(true)

  const parsed = useMemo(() => parseFeedback(text), [text])
  const activeRunId = scope === 'run' ? latestRunId : null

  const loadBoard = useCallback(async (runId: string | null, opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoadingBoard(true)
    try {
      const [boardRows, runRows] = await Promise.all([fetchBoard(runId), fetchRuns()])
      setRows(boardRows)
      setRuns(runRows)
      setLatestRunId((prev) => prev ?? runRows[0]?.id ?? null)
    } catch (err) {
      setError({
        title: 'Could not load the board',
        detail: err instanceof Error ? err.message : 'The saved feedback could not be read.',
      })
    } finally {
      setLoadingBoard(false)
    }
  }, [])

  // Initial load reads committed state from Postgres — this is what proves
  // persistence: a hard refresh reproduces the same board.
  useEffect(() => {
    if (configError) {
      setLoadingBoard(false)
      return
    }
    void loadBoard(null)
  }, [loadBoard])

  useEffect(() => {
    if (configError) return
    void loadBoard(activeRunId, { silent: true })
  }, [activeRunId, loadBoard])

  async function onAnalyze() {
    if (parsed.error || parsed.items.length === 0) return
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const result = await analyze(parsed.items)
      setLatestRunId(result.run_id)
      setScope('run')
      await loadBoard(result.run_id)

      const seconds = (result.duration_ms / 1000).toFixed(1)
      setNotice(
        result.coerced_count > 0
          ? `Classified ${result.item_count} items in ${seconds}s. ${result.coerced_count} item${result.coerced_count === 1 ? '' : 's'} did not match a known theme and ${result.coerced_count === 1 ? 'was' : 'were'} filed as Unclassified.`
          : `Classified and saved ${result.item_count} items in ${seconds}s.`,
      )
      setText('')
      setLoadedBatchId(null)
    } catch (err) {
      setError({
        title: 'Analysis failed',
        detail: err instanceof Error ? err.message : 'Nothing was saved. Please try again.',
      })
    } finally {
      setBusy(false)
    }
  }

  function onLoadSample(batch: SampleBatch) {
    setText(batchText(batch))
    setLoadedBatchId(batch.id)
    setNotice(null)
    setError(null)
  }

  async function onImportFile(file: File) {
    setImporting(true)
    setError(null)
    setNotice(null)
    try {
      const result = await importFile(file)
      // Every item is loaded, even beyond the batch limit. Truncation is only ever
      // an explicit user action — the system never silently drops feedback.
      setText(toTextarea(result.items))
      setLoadedBatchId(null)
      setNotice(
        result.items.length > MAX_ITEMS
          ? `${result.summary} That is over the ${MAX_ITEMS}-item batch limit — trim the box, or use the link below the counter to keep the first ${MAX_ITEMS}.`
          : result.summary,
      )
    } catch (err) {
      setError({
        title: 'Import failed',
        detail:
          err instanceof ImportError
            ? `${err.message} Nothing in the box was changed.`
            : `Could not read ${file.name}. Nothing in the box was changed.`,
      })
    } finally {
      setImporting(false)
    }
  }

  function onKeepFirst(n: number) {
    const kept = parsed.items.slice(0, n)
    const dropped = parsed.items.length - kept.length
    setText(toTextarea(kept))
    setNotice(
      `Kept the first ${kept.length} items. ${dropped} item${dropped === 1 ? '' : 's'} removed from the box — they were never sent or saved.`,
    )
  }

  const totalItems = rows.reduce((n, r) => n + Number(r.total), 0)
  const hasData = rows.length > 0

  if (configError) {
    return (
      <>
        <Masthead />
        <div className="page">
          <Banner kind="error" title="Setup incomplete" detail={configError} />
        </div>
      </>
    )
  }

  return (
    <>
      <Masthead />

      <div className="page">
        <section className="workflow">
          <span className="workflow-tag">CX</span>
          <div>
            <h3>Forward Deployed Engineer workflow</h3>
            <p>
              Priya pastes a weekly feedback batch <span className="sep">→</span> one Gemini call
              enforces 9 closed themes <span className="sep">→</span> validated and persisted to
              Postgres <span className="sep">→</span> renders an audited complaint board.
            </p>
            <div className="workflow-links">
              <a className="btn ghost sm" href={REPO_URL} target="_blank" rel="noreferrer">
                Source &amp; PRD
              </a>
              <a className="btn ghost sm" href={`${REPO_URL}/blob/main/supabase/migrations/0001_init.sql`} target="_blank" rel="noreferrer">
                Supabase schema
              </a>
              <a className="btn ghost sm" href={`${REPO_URL}/blob/main/docs/SETUP.md`} target="_blank" rel="noreferrer">
                Architecture notes
              </a>
            </div>
          </div>
        </section>

        {error && (
          <Banner kind="error" title={error.title} detail={error.detail} onDismiss={() => setError(null)} />
        )}
        {notice && <Banner kind="notice" title={notice} onDismiss={() => setNotice(null)} />}

        <InputPanel
          value={text}
          onChange={setText}
          parsed={parsed}
          busy={busy}
          onAnalyze={onAnalyze}
          onLoadSample={onLoadSample}
          onClear={() => {
            setText('')
            setLoadedBatchId(null)
          }}
          onImportFile={onImportFile}
          onKeepFirst={onKeepFirst}
          loadedBatchId={loadedBatchId}
          importing={importing}
        />

        <section className="card">
          <div className="section-head">
            <div className="section-title">
              <span className="step">2</span>
              <h2>Complaint Theme Board</h2>
              <span className="section-note">ranked by negative volume</span>
            </div>

            <div className="scope-wrap">
              <span className="scope-label">Time axis</span>
              <div className="scope" role="group" aria-label="Board scope">
                <button
                  className={`scope-btn${scope === 'run' ? ' active' : ''}`}
                  onClick={() => setScope('run')}
                  disabled={!latestRunId}
                  title={latestRunId ? 'Show only the most recent batch' : 'Run an analysis first'}
                >
                  This run
                </button>
                <button
                  className={`scope-btn${scope === 'all' ? ' active' : ''}`}
                  onClick={() => setScope('all')}
                >
                  All time ({runs.length})
                </button>
              </div>
            </div>
          </div>

          {loadingBoard && <p className="drill-status">Loading board…</p>}

          {!loadingBoard && !hasData && (
            <div className="empty">
              <p className="empty-title">
                {scope === 'run' ? 'This run produced no stored feedback.' : 'No feedback analysed yet.'}
              </p>
              <p className="empty-sub">
                Load a sample week above, or paste your own batch, then run the triage.
              </p>
            </div>
          )}

          {!loadingBoard && hasData && (
            <>
              <StatTiles rows={rows} />
              <ThemeTable rows={rows} runId={activeRunId} />
              <p className="board-foot">
                Every count expands to the original customer text — the board is auditable, not just
                indicative. {runs.length} batch{runs.length === 1 ? '' : 'es'} stored ·{' '}
                {scope === 'run' ? `${totalItems} items in this run` : `${totalItems} items all time`}
                {runs[0] && ` · last ingested ${new Date(runs[0].created_at).toLocaleTimeString()}`}
              </p>
            </>
          )}
        </section>

        <footer className="foot">
          <p>
            Input → one Gemini call (fixed 9-theme taxonomy, enforced again as a Postgres CHECK
            constraint) → validated → Supabase → board. The board renders from a database read, not
            the AI response, so a refresh proves persistence.
          </p>
          <p className="foot-warn">
            Demo build — no authentication. Do not paste feedback containing personal data.
          </p>
        </footer>
      </div>
    </>
  )
}

function Masthead() {
  return (
    <header className="masthead">
      <div className="masthead-inner">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">◈</span>
          <div>
            <div className="brand-title">
              <h1>Feedback Sentiment Board</h1>
              <span className="tag">FDE Sprint MVP</span>
            </div>
            <p>Batch feedback triage &amp; closed-taxonomy trend detection · Priya, Head of CX</p>
          </div>
        </div>

        <div className="chips">
          <span className="chip-status">
            <span className="dot" aria-hidden="true" />
            Gemini 3.6 Flash
          </span>
          <span className="chip-status">Supabase Postgres</span>
          <span className="chip-status">RLS read-only client</span>
        </div>
      </div>
    </header>
  )
}
