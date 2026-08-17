/**
 * Input parsing and client-side validation.
 *
 * Failure mode F2 (malformed / empty input) is defended here, BEFORE any network
 * call is made. An invalid paste must never reach the AI layer: it wastes spend,
 * it produces a confusing error far from its cause, and it risks a partial write.
 */

export const MAX_ITEMS = 40
export const MAX_CHARS = 12_000
export const BLOB_HINT_CHARS = 400

export type ParseResult = {
  items: string[]
  charCount: number
  /** Blocking problem — Analyze must stay disabled. */
  error: string | null
  /** Non-blocking advisory — the user can still proceed. */
  hint: string | null
}

export function parseFeedback(raw: string): ParseResult {
  const text = raw ?? ''
  const charCount = text.length

  // One feedback item per blank-line-separated block.
  const items = text
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)

  if (items.length === 0) {
    return {
      items,
      charCount,
      error: text.trim().length === 0 ? null : 'No feedback items found. Separate each item with a blank line.',
      hint: null,
    }
  }

  if (charCount > MAX_CHARS) {
    return {
      items,
      charCount,
      error: `Too long: ${charCount.toLocaleString()} characters (limit ${MAX_CHARS.toLocaleString()}). Split this into smaller batches.`,
      hint: null,
    }
  }

  if (items.length > MAX_ITEMS) {
    return {
      items,
      charCount,
      error: `Too many items: ${items.length} detected (limit ${MAX_ITEMS} per batch). Split this into smaller batches.`,
      hint: null,
    }
  }

  // Not an error: a single long paste is usually many items pasted without blank
  // lines between them. Warn before the user spends a run on it.
  const hint =
    items.length === 1 && charCount > BLOB_HINT_CHARS
      ? 'Only 1 item detected. If this is several pieces of feedback, separate each one with a blank line.'
      : null

  return { items, charCount, error: null, hint }
}
