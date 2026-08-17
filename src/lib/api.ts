import { SUPABASE_ANON_KEY, SUPABASE_URL } from './supabase'

export type AnalyzeSuccess = {
  ok: true
  run_id: string
  item_count: number
  /** Items whose theme or sentiment the model returned outside the taxonomy and
   *  which were filed as Unclassified. Disclosed rather than hidden. */
  coerced_count: number
  duration_ms: number
}

export type AnalyzeFailure = {
  ok: false
  stage: string
  message: string
  /** Always false in the MVP: a run either commits in full or not at all. */
  saved: boolean
}

const ANALYZE_TIMEOUT_MS = 45_000

/**
 * Calls the analyze Edge Function. Raw fetch rather than functions.invoke so that
 * the typed error body we return from the function reaches the UI intact.
 */
export async function analyze(items: string[]): Promise<AnalyzeSuccess> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ANALYZE_TIMEOUT_MS)

  let response: Response
  try {
    response = await fetch(`${SUPABASE_URL}/functions/v1/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ items }),
      signal: controller.signal,
    })
  } catch (err) {
    clearTimeout(timer)
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('Analysis timed out after 45 seconds. Nothing was saved — please try again with a smaller batch.')
    }
    throw new Error('Could not reach the analysis service. Nothing was saved — check your connection and try again.')
  }
  clearTimeout(timer)

  let body: unknown
  try {
    body = await response.json()
  } catch {
    throw new Error(`Analysis failed (HTTP ${response.status}). Nothing was saved — please try again.`)
  }

  if (!response.ok || !(body as AnalyzeSuccess).ok) {
    const failure = body as Partial<AnalyzeFailure>
    const detail = failure?.message ?? `HTTP ${response.status}`
    throw new Error(`${detail} Nothing was saved.`)
  }

  return body as AnalyzeSuccess
}
