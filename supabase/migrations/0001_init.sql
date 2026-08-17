-- ============================================================================
-- Feedback Sentiment Board — schema, constraints, RLS and aggregation
--
-- Two tables, not one: feedback_runs supplies the time axis that makes a trend
-- computable. A single flat table has no batch to compare against.
--
-- The theme taxonomy is enforced HERE as well as in the model's response schema.
-- Trend detection is only valid if the same complaint gets the same label every
-- week, so a hallucinated label must fail the write loudly rather than corrupt
-- the history quietly.
-- ============================================================================

-- ---------------------------------------------------------------- tables ----

create table if not exists public.feedback_runs (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  item_count  int not null check (item_count between 1 and 40)
);

create table if not exists public.feedback_items (
  id          uuid primary key default gen_random_uuid(),
  run_id      uuid not null references public.feedback_runs(id) on delete cascade,
  raw_text    text not null check (length(raw_text) between 1 and 4000),
  sentiment   text not null check (sentiment in ('positive', 'neutral', 'negative')),
  theme       text not null check (theme in (
                'delivery_delay',
                'packaging_damage',
                'product_quality',
                'wrong_item',
                'refund_returns',
                'customer_service',
                'pricing',
                'app_website',
                'other'
              )),
  summary     text,
  created_at  timestamptz not null default now()
);

create index if not exists feedback_items_theme_idx      on public.feedback_items (theme);
create index if not exists feedback_items_run_id_idx     on public.feedback_items (run_id);
create index if not exists feedback_items_created_at_idx on public.feedback_items (created_at desc);
create index if not exists feedback_runs_created_at_idx  on public.feedback_runs  (created_at desc);

-- ------------------------------------------------------------------- rls ----
-- The browser holds the anon key and may READ the board only. It has no insert,
-- update or delete policy, so the sole write path is the analyze Edge Function,
-- which validates before it writes and uses the service role server-side.

alter table public.feedback_runs  enable row level security;
alter table public.feedback_items enable row level security;

drop policy if exists "read runs"  on public.feedback_runs;
drop policy if exists "read items" on public.feedback_items;

create policy "read runs"
  on public.feedback_runs
  for select
  to anon, authenticated
  using (true);

create policy "read items"
  on public.feedback_items
  for select
  to anon, authenticated
  using (true);

-- ----------------------------------------------------- aggregation (rpc) ----
-- Aggregation runs in Postgres, not the browser. p_run_id = null aggregates all
-- time; passing a run id scopes the board to a single batch. One code path
-- serves both sides of the "This run / All time" toggle.

create or replace function public.theme_board(p_run_id uuid default null)
returns table (
  theme    text,
  total    bigint,
  negative bigint,
  neutral  bigint,
  positive bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    i.theme,
    count(*)                                            as total,
    count(*) filter (where i.sentiment = 'negative')    as negative,
    count(*) filter (where i.sentiment = 'neutral')     as neutral,
    count(*) filter (where i.sentiment = 'positive')    as positive
  from public.feedback_items i
  where p_run_id is null or i.run_id = p_run_id
  group by i.theme
  order by negative desc, total desc;
$$;

grant execute on function public.theme_board(uuid) to anon, authenticated;
