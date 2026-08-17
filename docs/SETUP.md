# Setup & Deployment

Four steps: database → Edge Function → frontend config → hosting.

---

## 1. Database

Open the [Supabase SQL Editor](https://supabase.com/dashboard/project/_/sql) and run the
entire contents of [`supabase/migrations/0001_init.sql`](../supabase/migrations/0001_init.sql).

It creates:

- `feedback_runs` and `feedback_items`
- `CHECK` constraints pinning the theme and sentiment taxonomies
- RLS with **select-only** access for the anon/publishable key
- the `theme_board(p_run_id uuid)` aggregation function

Verify:

```sql
select count(*) from feedback_runs;   -- 0
select * from theme_board(null);      -- 0 rows, no error
```

---

## 2. Edge Function

Requires the [Supabase CLI](https://supabase.com/docs/guides/cli).

```bash
npm install -g supabase          # or: brew install supabase/tap/supabase
supabase login                   # opens the browser
supabase link --project-ref <YOUR-PROJECT-REF>

# The Gemini key lives here and nowhere else.
supabase secrets set GEMINI_API_KEY=<your-gemini-key>

supabase functions deploy analyze
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically by the
Edge Functions runtime — do **not** set them manually.

Smoke test:

```bash
curl -X POST "https://<PROJECT-REF>.supabase.co/functions/v1/analyze" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <PUBLISHABLE-KEY>" \
  -d '{"items":["Box arrived crushed and two mugs were broken."]}'
```

Expected: `{"ok":true,"run_id":"…","item_count":1,"coerced_count":0,"duration_ms":…}`

### Alternative: deploy from the dashboard

Edge Functions → **Create function** → name it `analyze` → paste
`supabase/functions/analyze/index.ts` → Deploy. Then add `GEMINI_API_KEY` under
Edge Functions → Secrets.

---

## 3. Frontend configuration

```bash
cp .env.example .env.local
```

```env
VITE_SUPABASE_URL=https://<PROJECT-REF>.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable-key>
```

Both values are compiled into the public bundle and are safe to expose — the
publishable key has read-only access under RLS.

**Never put the Gemini key or the service role key in a `VITE_*` variable.** Every
`VITE_*` value is inlined into the client bundle and becomes public.

```bash
npm install
npm run dev          # http://localhost:5173
```

---

## 4. Hosting

### GitHub Pages (configured in this repo)

`.github/workflows/deploy.yml` builds and deploys on every push to `main`.

One-time setup:

1. **Settings → Pages → Source: GitHub Actions**
2. **Settings → Secrets and variables → Actions**, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

Deployed at `https://<user>.github.io/<repo>/`. The workflow sets `BASE_PATH` from
the repository name and copies `index.html` to `404.html` so client-side routing
survives a deep link.

### Vercel

```bash
npm install -g vercel
vercel login
vercel --prod
```

Framework preset **Vite**, build `npm run build`, output `dist`. Add
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` under Settings → Environment
Variables, then redeploy. No `BASE_PATH` needed — Vercel serves from the root.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| "Setup incomplete" banner | `VITE_*` variables missing at **build** time | Set them and rebuild — Vite inlines at build, not runtime |
| "The analysis service is not configured" | `GEMINI_API_KEY` secret not set | `supabase secrets set GEMINI_API_KEY=…`, then redeploy the function |
| Board stays empty after a successful run | Migration not applied, or RLS select policy missing | Re-run the migration |
| CORS error in console | Edge Function not deployed | `supabase functions deploy analyze` |
| 401 from the function | Missing `Authorization: Bearer <publishable-key>` | The app sends this automatically; only affects manual curl |
| Assets 404 on GitHub Pages | `BASE_PATH` not applied | Deploy through the workflow rather than uploading `dist` by hand |
| "no longer available to new users" from Gemini | Retired model id | `GEMINI_MODEL` in the Edge Function must be a model your key can access |
