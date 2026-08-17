import { useRef, useState } from 'react'
import { MAX_CHARS, MAX_ITEMS, type ParseResult } from '../lib/parse'
import { SAMPLE_BATCHES, type SampleBatch } from '../data/sample'
import { ACCEPTED_EXTENSIONS } from '../lib/fileImport'

type Props = {
  value: string
  onChange: (v: string) => void
  parsed: ParseResult
  busy: boolean
  onAnalyze: () => void
  onLoadSample: (batch: SampleBatch) => void
  onClear: () => void
  onImportFile: (file: File) => void
  onKeepFirst: (n: number) => void
  loadedBatchId: string | null
  importing: boolean
}

export function InputPanel({
  value,
  onChange,
  parsed,
  busy,
  onAnalyze,
  onLoadSample,
  onClear,
  onImportFile,
  onKeepFirst,
  loadedBatchId,
  importing,
}: Props) {
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const disabled = busy || importing
  const canAnalyze = !disabled && parsed.items.length > 0 && parsed.error === null
  const overLimit = parsed.items.length > MAX_ITEMS

  function handleFiles(files: FileList | null) {
    const file = files?.[0]
    if (file) onImportFile(file)
    // Reset so selecting the same file twice still fires a change event.
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <section className="card">
      <div className="section-head">
        <div className="section-title">
          <span className="step">1</span>
          <h2>Ingest Customer Feedback Batch</h2>
          <span className="section-note">1 item per blank-line block</span>
        </div>

        <div className="sample-group">
          <span className="sample-label">Load sample week</span>
          {SAMPLE_BATCHES.map((b) => (
            <button
              key={b.id}
              className={`pill${loadedBatchId === b.id ? ' active' : ''}`}
              onClick={() => onLoadSample(b)}
              disabled={disabled}
              title={`${b.note} — ${b.items.length} items`}
            >
              {b.label}
              <span className="pill-count">{b.items.length}</span>
            </button>
          ))}
          <button className="btn ghost sm" onClick={onClear} disabled={disabled || value.length === 0}>
            Clear
          </button>
        </div>
      </div>

      <div
        className={`drop${dragging ? ' active' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          if (!disabled) setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          if (!disabled) handleFiles(e.dataTransfer.files)
        }}
      >
        <textarea
          className="input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={'Box arrived crushed and two mugs were broken.\n\nStill waiting on my order, tracking has not updated in days.\n\nGreat quality, arrived early. Very happy.'}
          rows={10}
          disabled={disabled}
          spellCheck={false}
        />

        {dragging && (
          <div className="drop-overlay">
            <span>Drop to import — {ACCEPTED_EXTENSIONS.join(' · ')}</span>
          </div>
        )}
      </div>

      <div className="import-row">
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS.join(',')}
          onChange={(e) => handleFiles(e.target.files)}
          hidden
        />
        <button className="btn ghost sm" onClick={() => fileRef.current?.click()} disabled={disabled}>
          {importing ? 'Reading file…' : 'Upload file'}
        </button>
        <span className="import-hint">
          or drag a file onto the box — {ACCEPTED_EXTENSIONS.join(', ')}. CSV columns named
          {' '}<code>review</code>, <code>feedback</code>, <code>comment</code> are detected automatically.
        </span>
      </div>

      <div className="meta-row">
        <div className="meters">
          <span className="meter">
            Detected items
            <span className={`badge${overLimit ? ' bad' : parsed.items.length > 0 ? ' good' : ''}`}>
              {parsed.items.length} / {MAX_ITEMS} max
            </span>
          </span>
          <span className="meter">
            Characters
            <span className={`badge${parsed.charCount > MAX_CHARS ? ' bad' : ' plain'}`}>
              {parsed.charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()}
            </span>
          </span>
        </div>

        <button className="btn primary" onClick={onAnalyze} disabled={!canAnalyze}>
          {busy ? `Classifying ${parsed.items.length} items…` : 'Run Batch Triage'}
          {!busy && <span className="arrow">→</span>}
        </button>
      </div>

      {parsed.error && (
        <p className="inline-msg error">
          {parsed.error}
          {overLimit && (
            <button className="link-btn" onClick={() => onKeepFirst(MAX_ITEMS)}>
              Keep the first {MAX_ITEMS} and remove the rest
            </button>
          )}
        </p>
      )}
      {!parsed.error && parsed.hint && <p className="inline-msg hint">{parsed.hint}</p>}
    </section>
  )
}
