# Federation Worker

This Cloudflare Worker is what makes a consuming child site fetch shared
"federated" code (engine, styles, blocks) from the **foundation-kit-fed** repo
without CORS problems.

## How it works

The worker sits in front of this site. For every request:

- **`/libs/*`** → the worker fetches it from the **federated origin** (FED),
  stripping the `/libs` prefix. e.g. `/libs/scripts/ak.js` is served from
  `https://main--foundation-kit-fed--angelaccenture.aem.live/scripts/ak.js`.
- **everything else** → served from this site's own origin.

Because the browser only ever talks to this site's domain, `/libs/*` is
**same-origin** — no CORS. The cross-origin hop happens server-side in the worker.

## Testing an unmerged FED branch (`?fed-ref=`)

By default `/libs` comes from FED's `main`. To preview an **unmerged FED branch**
against this site (the "see my change's impact before I PR" workflow), add
`?fed-ref=<branch>` to the URL:

```
https://<this-site-worker>/?fed-ref=update-columns
```

The worker then serves `/libs/*` from `update-columns--foundation-kit-fed--angelaccenture.aem.page`
instead of main. Branch names are sanitized (letters/numbers/`.`/`_`/`-` only) so
the param can't point `/libs` at an arbitrary origin. Without the param, `/libs`
always resolves from `main` (safe for production).

## Files

- `federation-worker.js` — the worker code (the `/libs` rewrite logic)
- `wrangler.toml` — Cloudflare deploy config (name, entry file, runtime date)

## Reusing this for a new site

1. Copy this `workers/` folder into the new consuming site's repo.
2. In `federation-worker.js`, change `SITE_ORIGIN` to the new site's own
   `.aem.live` origin. Leave `FED_ORIGIN` as-is (shared libs source).
3. Update `name` in `wrangler.toml` if you want a distinct worker name.

## Deploying

**Option A — Connect to Git (recommended, auto-deploy):**
In Cloudflare: Workers & Pages → Create → Connect to Git → pick this repo →
set the root directory to `workers/`. Cloudflare reads `wrangler.toml` and
redeploys on every push.

**Option B — Manual paste (quick test):**
Workers & Pages → Create Worker → Start with Hello World → Edit code →
paste `federation-worker.js` → Deploy.

## Notes / known follow-ups

- FED's CSS references assets with root-relative paths (e.g.
  `/styles/fonts/montserrat.woff2`). Through `/libs` those resolve to the
  child origin and 404. Fix later by also proxying `/styles/*` (and other
  asset paths) to FED, or by making FED's CSS paths `/libs`-aware.
- For production, add a route (Triggers → Add route) mapping the real domain
  to this worker so the live site (not just the workers.dev URL) is federated.
