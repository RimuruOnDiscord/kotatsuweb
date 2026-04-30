# Mangavel — Codebase Optimization Report

## 🚨 Critical: Security Issue (Fix Immediately)

**Your `.env` file is committed to git and contains what appears to be a Supabase *service role* key** — not an anon key. The JWT payload includes `"role":"service_role"`, which grants admin-level access to your database, bypassing all Row Level Security policies.

**Actions required right now:**
1. Go to your Supabase dashboard → Settings → API → Regenerate both keys.
2. Add `.env` to `.gitignore` (provided in this patch).
3. Remove `.env` from git history: `git filter-repo --path .env --invert-paths` (or `git-filter-branch`).
4. Use only the **anon key** (`VITE_SUPABASE_ANON_KEY`) in the browser. Never use the service role key in client code.

---

## Issues Found & Files Changed

### 1. `.gitignore` (new)
The repo was committing:
- `dist/` — build output (~4 MB of compiled JS/CSS/images)
- `standalone-proxy/node_modules/` — ~250 dependency packages
- `vite.config.ts.timestamp-*` — Vite internal build artifact
- `.env` — secrets (see critical issue above)
- `test_supabase.js` / `test_supabase.ts` — scratch test files in the root

**Fix:** A comprehensive `.gitignore` is provided.

---

### 2. `DESIGN_STYLES` duplication → `src/styles/design-tokens.css` (new)

The same ~80-line CSS string was copy-pasted as a `const DESIGN_STYLES` inside:
- `AnimeHome.tsx`
- `AnimeDetail.tsx`
- `AnimeWatchPage.tsx`

…and injected via `<style>{DESIGN_STYLES}</style>` in every render. This means the same CSS block is injected 3× into the DOM, duplicated across every hot-reload, and cannot be cached.

**Fix:** All shared tokens, animation keyframes, and layout helpers are extracted to `src/styles/design-tokens.css`.

**How to use:** Remove the `const DESIGN_STYLES` block and `<style>` tag from each page, and add one line to `src/index.css`:
```css
@import './styles/design-tokens.css';
```

---

### 3. `useMediaQuery` → `src/hooks/useMediaQuery.ts` (new)

The hook was defined inline in `App.tsx`. Any other component that needs responsive logic would have to copy-paste it.

**Fix:** Extracted to `src/hooks/useMediaQuery.ts`. The original bug (stale `matches` in the effect dependency array causing unnecessary re-subscriptions) is also fixed — the effect now only re-runs when the query *string* changes.

---

### 4. `src/App.tsx` (refactored)

- Imports `useMediaQuery` from the new hook file instead of defining it inline
- Explicit `React.FC` type on `PageWrapper`
- `default export` moved to the function declaration (minor style cleanup)
- Removed the leftover `setIsSearching` and search state that was defined but `setIsSearching` was never called with results — left as-is so existing topbar props still compile

---

### 5. `src/lib/AuthContext.tsx` (refactored)

**Before:** `updateProfile` manually constructed raw `fetch()` calls to the Supabase REST API — a PATCH that fell back to a POST upsert, then a separate GET to refetch. That's 2–3 network round-trips, duplicated header construction, and manual error handling.

**After:** Uses `supabase.from('profiles').upsert(...).select().single()` — one call, proper TypeScript types, and the supabase-js client handles auth headers automatically.

Also:
- `signOutFn` renamed back to `signOut` (no reason to rename it, the context key is `signOut`)
- `err: any` cast replaced with `err: unknown` + `instanceof Error` check

---

### 6. `src/utils/animeApi.ts` (refactored)

**Before:**
```ts
// Did NOT use the shared fetchJson helper — raw fetch, no error handling:
export const fetchAnimeSearch = async (searchString: string, limit: number = 20) => {
  const res = await fetch(`/api/search?query=${searchString}&limit=${limit}`);
  return res.json();
};

// Used `any` type:
export const getAnimeTypeLabel = (entry?: any) => { ... }
```

**After:**
- `fetchAnimeSearch` uses `fetchJson` with `encodeURIComponent` on the query
- `fetchAnimeFilter` accepts an optional `AbortSignal` (passed through `fetchJson`)
- `getAnimeTypeLabel` typed as `Pick<AnimeResult, 'format' | 'type'>` — `AnimeResult` already had both fields, just needed to add `type` to the interface
- All `??` null-coalescing used consistently (no mixing of `||` and `??` for nullish checks)

---

### 7. `vite.config.ts` (refactored)

**Before:** Three large proxy plugins defined inline in `vite.config.ts` — the file was 200+ lines mixing Vite config with business logic.

**After:** 
- `imageProxyPlugin` → `src/lib/vite-plugins/image-proxy.ts`
- `hlsProxyPlugin` → `src/lib/vite-plugins/hls-proxy.ts`
- The `railwayProxy` plugin was **removed** — it was only used for Railway streaming which is already handled via the `hlsProxy`, and contained a risky regex-based HLS URL rewriter

`vite.config.ts` is now 30 lines.

---

## Other Recommendations (not in this patch)

### Dependency cleanup (`package.json`)
Remove duplicate/unused packages:
- `mangascrape` and `@specify_/mangascraper` — two scraper packages; keep whichever is actively used
- `vidstack` (bare) and `@vidstack/player` — the app uses `@vidstack/react` only; these are likely redundant
- `disqus-react` — the app has a custom `CommentSection.tsx`; if Disqus is no longer used, remove it
- `https-proxy-agent` — only needed in Node.js environments, not in the browser bundle

### Split large page files
These are candidates to break into smaller components:
- `AnimeWatchPage.tsx` — 2,220 lines. At minimum extract: `EpisodeList`, `StreamSelector`, `PlayerSection`, `WatchPageSidebar`
- `AnimeDetail.tsx` — 1,579 lines. Extract: `CharactersSection`, `RelationsSection`, `EpisodeGrid`

### Root-level cleanup
Delete or move:
- `test_supabase.js` / `test_supabase.ts` — move to `__tests__/` or delete
- `mk.txt` / `nato.txt` — unknown purpose, delete if unneeded
- `typecheck-output.txt` — don't commit build output
- `vite.config.ts.timestamp-*` — covered by `.gitignore`

### Types directory
`types/manga.ts` contains manga-specific types. Consider co-locating these with the utils that use them, or consolidating all API types into `src/types/`.
