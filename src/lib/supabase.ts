import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/**
 * Surfaced in the UI as a setup error rather than thrown at import time, so a
 * misconfigured deployment shows an explanation instead of a blank white page.
 */
export const configError =
  !url || !anonKey
    ? 'Missing configuration: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.'
    : null

export const SUPABASE_URL = url ?? ''
export const SUPABASE_ANON_KEY = anonKey ?? ''

// The browser holds the anon key only. It can read the board; RLS grants it no
// insert, update or delete. All writes go through the analyze Edge Function,
// which validates first and uses the service role server-side.
export const supabase = createClient(SUPABASE_URL || 'http://localhost', SUPABASE_ANON_KEY || 'public-anon-key', {
  auth: { persistSession: false },
})

export type ThemeRow = {
  theme: string
  total: number
  negative: number
  neutral: number
  positive: number
}

export type FeedbackItem = {
  id: string
  raw_text: string
  sentiment: string
  summary: string | null
  created_at: string
}

export type RunRow = {
  id: string
  created_at: string
  item_count: number
}

/** Aggregation runs in Postgres, not the browser. p_run_id = null means all time. */
export async function fetchBoard(runId: string | null): Promise<ThemeRow[]> {
  const { data, error } = await supabase.rpc('theme_board', { p_run_id: runId })
  if (error) throw new Error(`Could not load the board: ${error.message}`)
  return (data ?? []) as ThemeRow[]
}

export async function fetchRuns(): Promise<RunRow[]> {
  const { data, error } = await supabase
    .from('feedback_runs')
    .select('id, created_at, item_count')
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw new Error(`Could not load run history: ${error.message}`)
  return (data ?? []) as RunRow[]
}

export async function fetchItemsForTheme(theme: string, runId: string | null): Promise<FeedbackItem[]> {
  let query = supabase
    .from('feedback_items')
    .select('id, raw_text, sentiment, summary, created_at')
    .eq('theme', theme)
    .order('created_at', { ascending: false })
    .limit(200)

  if (runId) query = query.eq('run_id', runId)

  const { data, error } = await query
  if (error) throw new Error(`Could not load feedback for this theme: ${error.message}`)
  return (data ?? []) as FeedbackItem[]
}
