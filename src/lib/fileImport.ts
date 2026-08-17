/**
 * File import: CSV / TSV / TXT / Markdown → a list of feedback items.
 *
 * Deliberately dependency-free. A CSV parser is ~60 lines and a library would be
 * a bigger supply-chain surface than the problem justifies.
 *
 * The guiding rule matches the rest of the system: never silently drop feedback.
 * If a file yields more items than a batch allows, all of them are loaded and the
 * user is told — truncation is only ever an explicit user action.
 */

export const MAX_FILE_BYTES = 512 * 1024
export const ACCEPTED_EXTENSIONS = ['.csv', '.tsv', '.txt', '.md']

/** Column names that usually hold the feedback text itself. */
const HEADER_HINTS = [
  'feedback', 'review', 'comment', 'text', 'message', 'ticket',
  'body', 'description', 'content', 'remarks', 'verbatim', 'response', 'note',
]

export type ImportResult = {
  items: string[]
  /** Human-readable account of what was read, shown to the user. */
  summary: string
}

export class ImportError extends Error {}

/**
 * Split CSV/TSV text into rows of fields.
 * Handles quoted fields, escaped quotes (""), embedded delimiters and newlines,
 * and both LF and CRLF line endings.
 */
export function parseDelimited(text: string, delimiter: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  let sawContent = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += char
      }
      continue
    }

    if (char === '"') {
      inQuotes = true
      sawContent = true
    } else if (char === delimiter) {
      row.push(field)
      field = ''
      sawContent = true
    } else if (char === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
      sawContent = false
    } else if (char !== '\r') {
      field += char
      sawContent = true
    }
  }

  // Flush the final row unless the file simply ended with a newline.
  if (sawContent || field.length > 0) {
    row.push(field)
    rows.push(row)
  }

  return rows
}

function detectDelimiter(text: string): string {
  const firstLine = text.slice(0, 5000).split('\n')[0] ?? ''
  const tabs = (firstLine.match(/\t/g) ?? []).length
  const commas = (firstLine.match(/,/g) ?? []).length
  return tabs > commas ? '\t' : ','
}

/**
 * Pick the column holding the feedback text.
 * Prefers a recognised header name; otherwise falls back to the column with the
 * most text in it, which is reliably the free-text field.
 */
function chooseColumn(rows: string[][]): { index: number; hasHeader: boolean; headerName: string | null } {
  const header = rows[0] ?? []

  for (let c = 0; c < header.length; c++) {
    const name = header[c].trim().toLowerCase().replace(/[_-]+/g, ' ')
    if (HEADER_HINTS.some((hint) => name === hint || name.includes(hint))) {
      return { index: c, hasHeader: true, headerName: header[c].trim() }
    }
  }

  if (header.length === 1) return { index: 0, hasHeader: false, headerName: null }

  const columnCount = Math.max(...rows.map((r) => r.length))
  let best = 0
  let bestScore = -1
  for (let c = 0; c < columnCount; c++) {
    let total = 0
    let count = 0
    for (const r of rows) {
      const cell = (r[c] ?? '').trim()
      if (cell.length > 0) {
        total += cell.length
        count++
      }
    }
    const score = count > 0 ? total / count : 0
    if (score > bestScore) {
      bestScore = score
      best = c
    }
  }
  return { index: best, hasHeader: false, headerName: null }
}

/**
 * Items are joined with blank lines when written into the textarea, so any blank
 * line *inside* an item would split it on the round trip. Collapse them.
 */
function normaliseItem(raw: string): string {
  return raw.replace(/\r/g, '').replace(/\n\s*\n+/g, '\n').trim()
}

function extractFromDelimited(text: string, fileName: string): ImportResult {
  const delimiter = detectDelimiter(text)
  const rows = parseDelimited(text, delimiter).filter((r) => r.some((c) => c.trim().length > 0))

  if (rows.length === 0) throw new ImportError(`${fileName} appears to be empty.`)

  const { index, hasHeader, headerName } = chooseColumn(rows)
  const dataRows = hasHeader ? rows.slice(1) : rows

  const items = dataRows.map((r) => normaliseItem(r[index] ?? '')).filter((s) => s.length > 0)

  if (items.length === 0) {
    throw new ImportError(`No feedback text found in ${fileName}. Expected a column of review or ticket text.`)
  }

  const columnLabel = headerName ? `column "${headerName}"` : `column ${index + 1}`
  const skipped = dataRows.length - items.length
  const skippedNote = skipped > 0 ? `, ${skipped} empty row${skipped === 1 ? '' : 's'} skipped` : ''

  return {
    items,
    summary: `Loaded ${items.length} item${items.length === 1 ? '' : 's'} from ${fileName} (${columnLabel}${skippedNote}).`,
  }
}

function extractFromPlainText(text: string, fileName: string): ImportResult {
  const blocks = text
    .split(/\n\s*\n/)
    .map(normaliseItem)
    .filter((s) => s.length > 0)

  const lines = text
    .split(/\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)

  // A file with no blank lines but many lines is one item per line, not one item.
  const useLines = blocks.length <= 1 && lines.length > 3
  const items = useLines ? lines : blocks

  if (items.length === 0) throw new ImportError(`${fileName} appears to be empty.`)

  return {
    items,
    summary: `Loaded ${items.length} item${items.length === 1 ? '' : 's'} from ${fileName} (${useLines ? 'one per line' : 'blank-line separated'}).`,
  }
}

export function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf('.')
  return dot === -1 ? '' : fileName.slice(dot).toLowerCase()
}

/** Parse already-read file text. Kept separate from the File API so it is testable. */
export function extractItems(text: string, fileName: string): ImportResult {
  const ext = extensionOf(fileName)
  if (ext === '.csv' || ext === '.tsv') return extractFromDelimited(text, fileName)
  return extractFromPlainText(text, fileName)
}

export async function importFile(file: File): Promise<ImportResult> {
  const ext = extensionOf(file.name)

  if (!ACCEPTED_EXTENSIONS.includes(ext)) {
    throw new ImportError(
      `${file.name} is not a supported file type. Upload ${ACCEPTED_EXTENSIONS.join(', ')}.`,
    )
  }
  if (file.size === 0) throw new ImportError(`${file.name} is empty.`)
  if (file.size > MAX_FILE_BYTES) {
    throw new ImportError(
      `${file.name} is ${(file.size / 1024).toFixed(0)} KB. The limit is ${MAX_FILE_BYTES / 1024} KB — split the file first.`,
    )
  }

  let text: string
  try {
    text = await file.text()
  } catch {
    throw new ImportError(`Could not read ${file.name}.`)
  }

  return extractItems(text, file.name)
}

/** Canonical textarea format: one item per blank-line-separated block. */
export function toTextarea(items: string[]): string {
  return items.join('\n\n')
}
