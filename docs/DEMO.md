# Demo Script — 3 minutes + Q&A

**Live:** https://shivam-25.github.io/feedback-sentiment-board/
**Repo:** https://github.com/shivam-25/feedback-sentiment-board

---

## Before you start (30 seconds, off-camera)

1. Open the live link. Confirm the board loads with existing data — that alone proves persistence.
2. Set the scope toggle to **All time**.
3. Have a second tab open on the [Supabase table editor](https://supabase.com/dashboard/project/fxfowevbjdbzenvbfxey/editor) — you may want to show real rows.
4. Do **not** pre-load a sample. Start from a clean textarea.

---

## The demo

### 1. Frame the problem (20s) — do not touch the screen yet

> "Priya runs CX at a D2C brand. Her team gets hundreds of reviews and tickets a week, but only the handful an agent manually flags ever gets read. So a packaging defect can run for three or four weeks before anyone notices — and the brand pays for that same failure hundreds of times.
>
> One thing we changed in discovery: the brief said 'tag by sentiment and theme'. Sentiment alone is a vanity metric — Priya already knows some feedback is negative. What she can't get is **the count per cause, and whether it's growing**. So theme is the primary axis. Sentiment is just a filter."

**Why this wins points:** Discovery Clarity is 25%. You just showed you re-scoped the brief rather than implementing it literally.

---

### 2. Run Week 1 (35s)

- Click **Week 1** → point at `Detected items 20 / 40 max`.

> "One item per blank-line block. It's validated in the browser before anything is sent — empty, oversized or unsplittable input never reaches the API and never costs a call."

- Click **Run Batch Triage**.

> "That's **one** AI call for the whole batch, not one per item. Twenty items, one request."

- When it lands, read the green banner aloud: *"Classified and saved 20 items in 9.2s."*

---

### 3. Read the board (30s)

- Point at the three tiles: total classified, negative share, **top complaint driver**.

> "This is the whole product. Priya doesn't need to read anything — she needs to know which cause to hand to which team."

- Expand the top theme row.

> "And every count expands to the original customer sentences. This matters: an unauditable dashboard gets disputed and ignored. When she tells the packaging team '9 complaints this week', she can show them the nine."

---

### 3b. Import a file (optional, 20s)

Only if you have time, or if a judge asks about real-world ingestion.

- Click **Upload file** and pick a CSV export (or drag it onto the box).

> "It parses real CSV — quoted fields, embedded commas, newlines inside cells — and finds
> the feedback column by header name. And if the file has more rows than a batch allows, it
> loads all of them and blocks, rather than quietly processing the first 40. Same principle
> as everywhere else: never silently drop feedback."

---

### 4. Show the trend — the money shot (40s)

- Load **Week 2** → Run. Then **Week 3** → Run.
- Toggle **This run** ↔ **All time**.

> "Packaging goes 3, then 6, then 9. That's the product working. And it only works because the taxonomy is **closed** — nine fixed themes, no free-form labels.
>
> If the model were allowed to invent theme names, week one would say 'packaging damaged', week two 'poor packaging', week three 'box crushed' — three themes, no trend, and the whole thing is worthless. So the enum is enforced twice: once in Gemini's response schema, and again as a CHECK constraint in Postgres. A hallucinated label can't enter the history — the write fails loudly instead of corrupting the trend quietly."

**Why this wins points:** this is the single Key Architecture Decision, demonstrated rather than described.

---

### 5. Prove it's real, not a mock (20s)

- **Hard refresh the page.** Board comes back identical.

> "The board renders from a Postgres read, not from the AI response held in memory. A refresh reproduces it exactly — persistence demonstrated, not claimed."

- Optional: flip to the Supabase tab and show the actual rows.

---

### 6. Break it on purpose (25s) — do this, don't skip it

- Clear the box, type one word, press Run.

> "Blocked in the browser. Specific message, no spend, nothing written."

- Then the honest line:

> "And if the model returns 19 results for 20 items, we reject the entire batch and write nothing. A silently dropped complaint is exactly the failure this product exists to prevent — so a visible error is strictly better than a partial save. Every failure message tells you whether anything was saved."

**Why this wins points:** judges explicitly ask *"what happens with malformed input?"*. You answered before they asked, and showed the failure path working.

---

## Feature checklist — make sure each gets airtime

| Feature | How you show it | The point it makes |
|---|---|---|
| Blank-line parsing + live counter | Load a week, point at the badge | Validation is client-side and free |
| CSV / TXT / drag-drop import | Upload a file | Real ingestion path, no silent truncation |
| One call per batch | Say it while it runs | Latency and cost architecture |
| Closed 9-theme taxonomy | Week 1→2→3 trend | The key architecture decision |
| Enforced twice (schema + CHECK) | Say it at the trend moment | Integrity, not just prompting |
| Ranked board, no charts | Point at ordering | Deliberate scope decision |
| Verbatim drill-down | Expand a row | Auditability = adoption |
| Unclassified bucket | Point at `% unclassified` on tile 1 | Honest about blind spots |
| This run / All time | Toggle | Trend needs a time axis |
| Persistence | Hard refresh | Build Execution, 30% |
| Failure transparency | Break it | Failure-mode reasoning |

---

## Q&A — the five they said they'd ask

**"Why this architecture over a simpler one?"**
> The simpler build — browser calls Gemini directly and renders the response — fails three constraints at once: it exposes the API key in the bundle, it loses everything on refresh, and with no stored history there's no trend, which is the entire product. The Edge Function is the minimum addition that fixes the secret and gives one server-side place to validate before anything is written.

**"What happens if a user pastes malformed or empty input?"**
> Three defences in series. The browser parses and validates first, so bad input never costs an API call. The Edge Function then validates the model's output — JSON parses, count parity, enum legality. Postgres is the last gate with CHECK constraints. A failure at any layer rejects the whole batch and writes nothing, so retry is always safe.

**"Why this Supabase schema and not a different structure?"**
> Two tables because trending needs a time axis, and a flat table has no batch to compare against. Normalised rows rather than a JSONB blob because the whole product is `GROUP BY theme`. A CHECK constraint rather than a themes lookup table because nine near-static values don't justify a join on every read — and the constraint is the cheapest place to make drift impossible rather than unlikely. `raw_text` on every row because an unauditable board doesn't get trusted.

**"What breaks first at 10x load?"**
> Not Postgres — this volume is trivial for it. The first bottleneck is the single synchronous Gemini call: around 400 items per paste we blow both the latency budget and the output token ceiling. Fix order is chunk into 40-item batches inside the Edge Function, then an async job with polling, then materialise the aggregate view. Model rate limits and Edge Function concurrency saturate well before the database does.

**"What did you deliberately leave out, and why?"**
> Auth, live integrations, charts, classification override, alerting, dedup and export — each scored with RICE. The sharpest one is charts: the decision Priya makes is a **ranking**, not a shape. A chart library would have been build risk with no added insight. And dedup was excluded on purpose — two customers reporting the same defect is signal, not noise.

---

## Likely follow-ups

**"How do you know the AI is right?"**
> We don't claim it is — we claim it's *consistent*, and we make it *checkable*. Consistency comes from the closed taxonomy enforced in two places. Checkability comes from storing every verbatim. Accuracy would be a measured number against a hand-labelled golden set, not an assertion — and the Unclassified bucket is shown rather than hidden so the taxonomy's blind spots stay visible.

**"What about prompt injection in the feedback?"**
> We tested it. An item saying *"ignore all previous instructions"* gets classified as Unclassified and nothing else happens. The blast radius is bounded by construction: the model can only emit values inside a fixed enum and the database rejects anything else, so the worst achievable outcome is one mislabelled row.

**"Is the API key safe?"**
> It's a Supabase Edge Function secret and never enters the bundle — you can check the deployed source. The browser holds only a publishable key, and RLS gives it SELECT and nothing else. There's no insert, update or delete policy at all, so the only write path is the validated server function.

**"Why Gemini 3.6 Flash?"**
> Pinned, not an alias — a moving model would let classifications shift silently between weeks, which breaks the trend guarantee. We also set thinking to minimal: it cut a 16-item batch from 25.6s to 8.5s *and* improved accuracy, because classifying against a fixed taxonomy needs recall, not deliberation.

---

## If it breaks live

Say this, verbatim:

> "That's the model rate limit / a network failure. Note what the UI told us — *nothing was saved*. That's by design: the batch is rejected as a unit, so retrying is safe and there's no partial state to reconcile. Let me retry."

Then retry. Judges explicitly said they value honest reasoning over a perfect facade — a clean failure path is a feature, not an excuse.
