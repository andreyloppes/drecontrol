# DRE Control - Comprehensive Code Review

**Reviewer:** Dex (Senior Full-Stack Developer)
**Date:** 2026-03-30
**Scope:** Full codebase audit - functionality, UX, bugs, performance, PWA readiness

---

## 1. BUGS FOUND

### CRITICAL

**BUG-01: Connection.tsx destructures methods that don't exist on SupabaseContext**
- **File:** `src/pages/Connection.tsx:34`
- **Severity:** CRITICAL
- **Details:** `const { connect, disconnect, isConnected, config } = useSupabase();` -- but `SupabaseContext` only exposes `{ client }`. The `connect`, `disconnect`, `isConnected`, and `config` properties do not exist. This page will crash with a runtime error if ever rendered.
- **Impact:** The entire Connection page is broken. Fortunately, it is not routed in `App.tsx` (no route points to it), so users never hit it -- but it's dead code with a fatal error.

**BUG-02: No auth guard on /dashboard -- anyone can access it**
- **File:** `src/App.tsx:22`, `src/pages/Login.tsx`
- **Severity:** CRITICAL
- **Details:** Login only saves a name to localStorage. There is zero verification on the `/dashboard` route. Navigating directly to `/dashboard` bypasses login entirely. No ProtectedRoute, no session check, no redirect.
- **Impact:** The login page is purely cosmetic. It provides no access control whatsoever.

### HIGH

**BUG-03: `loading` state returned by useFinance but never consumed**
- **File:** `src/hooks/useFinance.ts:12,313`, `src/pages/Index.tsx`
- **Severity:** HIGH
- **Details:** `useFinance()` returns `loading` state, but Index.tsx never destructures or uses it. On initial load, the dashboard renders with empty data (0 values everywhere) until Supabase responds. There's no loading skeleton, spinner, or indication that data is being fetched.
- **Impact:** Users see a flash of empty/zero content before real data appears. Poor perceived performance.

**BUG-04: No delete confirmation dialog**
- **File:** `src/components/TransactionList.tsx:188-191`
- **Severity:** HIGH
- **Details:** Clicking the trash icon instantly calls `onDelete(t.id)` which permanently deletes the transaction from Supabase with no confirmation prompt, no undo, no "Are you sure?" dialog.
- **Impact:** Accidental data loss. One misclick permanently destroys a record.

**BUG-05: Groq API key stored in localStorage in plaintext**
- **File:** `src/components/AIAssistant.tsx:31,45`
- **Severity:** HIGH
- **Details:** The Groq API key is stored via `localStorage.setItem(GROQ_KEY_STORAGE, tempKey)`. Anyone with browser devtools access can read it. Also, the key is sent directly to Groq from the client, exposing it in network traffic to anyone inspecting.
- **Impact:** API key leakage. Should ideally be proxied through a backend, or at minimum users should be clearly warned.

### MEDIUM

**BUG-06: `glass-morphism` CSS class used but never defined**
- **File:** `src/pages/Login.tsx:38`
- **Severity:** MEDIUM
- **Details:** The login page uses `glass-morphism` class on the lock icon container. This class is never defined in `index.css` or anywhere else. Only `glass` is defined.
- **Impact:** The lock icon container has no backdrop-blur/glass styling. Visual bug only.

**BUG-07: App.css is imported nowhere -- dead CSS file**
- **File:** `src/App.css`
- **Severity:** MEDIUM
- **Details:** `App.css` contains Vite scaffolding CSS (`.logo`, `.card`, `.read-the-docs`). It is never imported by any file. It also overrides `#root` with `max-width: 1280px`, `padding: 2rem`, and `text-align: center` which would break the layout if ever imported.
- **Impact:** Dead code, potential confusion.

**BUG-08: Sonner Toaster uses `next-themes` but app uses custom theme system**
- **File:** `src/components/ui/sonner.tsx:1,7`
- **Severity:** MEDIUM
- **Details:** The Sonner wrapper imports `useTheme` from `next-themes`, but the app's theme toggle (`ThemeToggle.tsx`) manages theme via direct DOM class manipulation + localStorage. `next-themes` is not configured with a `ThemeProvider`, so `useTheme()` likely returns `"system"` always, meaning toasts may not correctly follow the user's chosen dark/light theme.
- **Impact:** Toast theme may not match the app's current theme state.

**BUG-09: Pagination resets should happen on filter/search change**
- **File:** `src/components/TransactionList.tsx:39`
- **Severity:** MEDIUM
- **Details:** `currentPage` state is local. When the user switches months, changes search term, or toggles type filter, the page number is not reset. If the user was on page 3 and switches to a month with only 5 transactions, they see an empty list.
- **Impact:** Confusing empty state after switching filters.

**BUG-10: `div` nested inside `p` element (invalid HTML)**
- **File:** `src/pages/Login.tsx:68`
- **Severity:** MEDIUM
- **Details:** Inside a `<p>` tag, there's `<div className="w-1 h-1 bg-cyan-400 rounded-full animate-pulse" />`. Block-level `div` inside inline `p` is invalid HTML and causes DOM parsing issues.
- **Impact:** Potential rendering inconsistencies across browsers.

### LOW

**BUG-11: "Abordar" typo on Connection page button**
- **File:** `src/pages/Connection.tsx:165`
- **Severity:** LOW
- **Details:** Button text says "Abordar" (to approach/address). It should be "Abortar" (to abort) or "Voltar" (go back).
- **Impact:** Confusing button label. Page is dead code anyway.

**BUG-12: NavLink component created but never used**
- **File:** `src/components/NavLink.tsx`
- **Severity:** LOW
- **Details:** A fully-built NavLink wrapper exists but is not imported anywhere.
- **Impact:** Dead code.

**BUG-13: `use-toast.ts` duplicated at two paths**
- **File:** `src/hooks/use-toast.ts` and `src/components/ui/use-toast.ts`
- **Severity:** LOW
- **Details:** Two files implementing toast hooks. The UI one just re-exports from the hooks one. Confusing structure.
- **Impact:** Maintenance confusion, extra bundle weight.

**BUG-14: Transaction edit doesn't handle type change properly for amount sign**
- **File:** `src/hooks/useFinance.ts:73-84`
- **Severity:** LOW
- **Details:** In `editTransaction`, when only `type` is updated (without `amount`), the stored amount's sign is not corrected. If a user changes a "projeto" to "despesa" without touching the amount field, the positive amount remains positive -- contradicting the business logic.
- **Impact:** Data integrity issue on edge-case edits.

---

## 2. UX ISSUES

### UX-01: No loading state on initial data fetch
The dashboard shows all stats at R$ 0,00 until Supabase responds. Should show skeleton loaders or a spinner. On slow connections, users will think the app is broken.

### UX-02: Transaction list hidden when empty month
If a month has zero transactions and there's no search term, the entire transaction list section disappears (line 195: `filteredTransactions.length > 0 || searchTerm`). Users have no way to see the search bar or type filter for that month. The empty state should still show the search bar and a clear "No transactions this month" message.

### UX-03: Mobile edit/delete buttons invisible
In `TransactionList.tsx`, edit and delete buttons use `opacity-0 group-hover:opacity-100`. On touch devices (iPhone), there is no hover state. These action buttons are permanently invisible on mobile.

### UX-04: No "Back to login" or logout button on dashboard
Once on `/dashboard`, there's no navigation back, no user greeting, no logout. The header only has the theme toggle.

### UX-05: Stats card layout overflows on iPhone 13 Pro (390px wide)
The stats section uses `grid-cols-2` on mobile with cards containing long currency values + lengthy descriptions (e.g., "Pago: R$ 10.000,00 | Prev: R$ 5.000,00"). At 390px, these descriptions get cut off or cause horizontal overflow.

### UX-06: DFC Chart not optimized for mobile
The chart has fixed height of 400px and uses dual Y-axes. On a 390px-wide screen, the chart is cramped, axis labels overlap, and the legend is hard to read. No mobile-specific layout adjustment.

### UX-07: MonthFilter navigation has no quick jump
Users can only go one month at a time with arrow buttons. No dropdown or calendar picker to quickly jump to a specific month (e.g., January 2025).

### UX-08: No visual differentiation between "despesa" and income in form type buttons on mobile
The 3 type buttons ("Projeto", "Recorrencia", "Despesa") are in a 3-column grid. On 390px screens, each button gets ~110px -- text barely fits, especially "Recorrencia" which might wrap.

### UX-09: No feedback when adding a transaction succeeds (form doesn't scroll to list)
After adding a transaction, the form clears but the user doesn't see the transaction in the list unless they scroll down. No auto-scroll or visual confirmation besides the toast.

### UX-10: Light mode is poorly designed
The design was clearly built for dark mode. In light mode, the `glass` class uses `bg-white/10 backdrop-blur-md border border-white/20` which is nearly invisible against a white background. The cyan/purple gradient effects look washed out. The cyber-grid and neon effects are invisible.

---

## 3. PERFORMANCE ISSUES

### PERF-01: Bundle size is 1.0 MB for index.js + 437 KB for pdf.js
- `dist/assets/index-BB6J2bDT.js` = **1.0 MB**
- `dist/assets/pdf-fe5Q_vu3.js` = **437 KB**
- Total JS: **~1.44 MB** (before gzip)
- The app ships Recharts, 50+ shadcn/ui components (most unused), pdf.js, and all Radix primitives in one bundle.

### PERF-02: 34 unused shadcn/ui components installed
Only ~16 UI components are actually used (button, input, label, card, toast, sonner, table, badge, dropdown-menu, dialog, tooltip, toggle, separator, skeleton, sheet). The remaining 34 components (sidebar, carousel, chart, menubar, command, etc.) are dead code that tree-shaking may or may not fully eliminate from the bundle.

### PERF-03: No code splitting or lazy loading
- All pages (Index, Login, NotFound) are eagerly loaded in `App.tsx`
- No `React.lazy()` or `Suspense` anywhere
- pdf.js is dynamically imported in `statement-parser.ts` (good), but it's in a separate chunk only because Vite splits it. The main index.js still contains everything else.

### PERF-04: No React.memo on any component
- `StatsCard`, `MonthlyTable`, `DFCChart`, `TransactionList`, `MonthFilter` all re-render on every parent state change. The DFC chart in particular is expensive to re-render.

### PERF-05: `getDailyCashFlow` recalculates on every transaction change
- `src/hooks/useFinance.ts:247-290` -- this function iterates all historical transactions to compute running balance. With many transactions (1000+), this becomes expensive on every render cycle.

### PERF-06: `formatCurrency` recreated on every render
- `Intl.NumberFormat` is constructed inline in multiple components (StatsCard, MonthlyTable, TransactionList, Index, AIAssistant). It should be a shared utility.

### PERF-07: Google Fonts loaded via CSS @import (render-blocking)
- `src/index.css:1-3` loads 3 font families via `@import url()`. These are render-blocking. Should be loaded via `<link rel="preconnect">` + `<link rel="stylesheet">` in `index.html` with `display=swap`.

### PERF-08: `pdfjs-dist` is 437KB and rarely needed
- The PDF parser is only used when importing bank statements. It should be fully lazy-loaded (it already partially is, but the chunk is still created at build time and loaded eagerly depending on the bundler config).

### PERF-09: No React.StrictMode in development
- `main.tsx` renders without StrictMode, missing double-render checks that help catch side-effect bugs.

---

## 4. PWA GAPS

### PWA-01: No manifest.json
No `manifest.json` or `manifest.webmanifest` file exists. This is the minimum requirement for "Add to Home Screen" on iOS/Android.

### PWA-02: No service worker
No service worker registered. Required for:
- Offline support
- Background sync
- Push notifications (future)
- Reliable "Add to Home Screen" prompt on Android

### PWA-03: No apple-touch-icon
No `<link rel="apple-touch-icon">` in `index.html`. Without this, iOS uses a screenshot as the home screen icon, which looks unprofessional.

### PWA-04: No theme-color meta tag
No `<meta name="theme-color">` to control the browser chrome/status bar color on mobile.

### PWA-05: No apple-mobile-web-app-capable meta tags
Missing iOS-specific meta tags:
- `<meta name="apple-mobile-web-app-capable" content="yes">`
- `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`
These are required for fullscreen web app experience on iPhone.

### PWA-06: Viewport meta tag missing `viewport-fit=cover`
Current: `width=device-width, initial-scale=1.0`
Needed: `width=device-width, initial-scale=1.0, viewport-fit=cover`
Without `viewport-fit=cover`, the app doesn't extend into the safe area (notch region) on iPhone 13 Pro.

### PWA-07: No splash screens for iOS
iOS requires specific `<link rel="apple-touch-startup-image">` tags with different sizes for the splash screen shown during launch.

### PWA-08: No icon set in multiple sizes
Only `favicon.png` (423KB -- way too large for a favicon!) and `favicon.ico` exist. Need icons at 192x192, 512x512, and 180x180 (apple-touch-icon) minimum.

### PWA-09: favicon.png is 423KB
The favicon is a 423KB PNG. This is enormous. Should be optimized to < 10KB, and multiple sizes should be generated.

---

## 5. IMPROVEMENT PLAN

### Phase A: Critical Fixes (bugs, broken features)

| # | Task | Files | What to do | Complexity |
|---|------|-------|------------|------------|
| A1 | Fix or remove Connection.tsx | `src/pages/Connection.tsx`, `src/App.tsx` | Either remove Connection.tsx entirely (it's dead code with no route), or implement the missing `connect/disconnect/isConnected/config` in SupabaseContext. Recommendation: remove it -- the app uses env vars for Supabase now. | S |
| A2 | Add auth guard on /dashboard | `src/App.tsx`, new `src/components/ProtectedRoute.tsx` | Create a ProtectedRoute wrapper that checks localStorage for user_name and redirects to `/` if not found. Wrap the `/dashboard` route with it. | S |
| A3 | Add loading skeleton to Index.tsx | `src/pages/Index.tsx` | Destructure `loading` from useFinance. When `loading === true`, show skeleton components for stats cards, chart, and table. | S |
| A4 | Add delete confirmation dialog | `src/components/TransactionList.tsx` | Wrap the delete action in an AlertDialog (already installed as a shadcn component). "Are you sure? This action cannot be undone." | S |
| A5 | Fix mobile edit/delete button visibility | `src/components/TransactionList.tsx:181-191` | Replace `opacity-0 group-hover:opacity-100` with always-visible buttons on mobile. Use `opacity-100 md:opacity-0 md:group-hover:opacity-100`. | S |
| A6 | Fix pagination reset on filter change | `src/components/TransactionList.tsx` | Add `useEffect` that resets `currentPage` to 1 when `transactions` prop changes (length or content). | S |
| A7 | Fix `glass-morphism` class | `src/pages/Login.tsx:38` | Change `glass-morphism` to `glass` (the defined class). | S |
| A8 | Fix div-inside-p invalid HTML | `src/pages/Login.tsx:68` | Change `<p>` to `<div>` or change inner `<div>` to `<span>`. | S |
| A9 | Fix Sonner theme integration | `src/components/ui/sonner.tsx` | Replace `useTheme` from `next-themes` with a custom hook that reads the theme from `document.documentElement.classList` or localStorage. Remove `next-themes` from dependencies. | S |
| A10 | Fix edit transaction type-amount sign bug | `src/hooks/useFinance.ts:73-84` | When `type` is updated without `amount`, recalculate the sign of the existing amount based on the new type. | S |

### Phase B: PWA Setup (manifest, service worker, icons, viewport)

| # | Task | Files | What to do | Complexity |
|---|------|-------|------------|------------|
| B1 | Create manifest.json | `public/manifest.json`, `index.html` | Create manifest with app name "DRE Control", short_name "DRE", start_url "/", display "standalone", background_color "#030712", theme_color "#06b6d4". Link it in index.html. | S |
| B2 | Generate and add icon set | `public/icons/` | Generate icons at 72, 96, 128, 144, 152, 192, 384, 512px from the existing logo. Add 180x180 apple-touch-icon. Optimize favicon.png to < 10KB. | M |
| B3 | Add apple-mobile-web-app meta tags | `index.html` | Add: `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`, `apple-touch-icon`, `theme-color`. Update viewport with `viewport-fit=cover`. | S |
| B4 | Install and configure vite-plugin-pwa | `package.json`, `vite.config.ts` | Add `vite-plugin-pwa` for automatic service worker generation (Workbox). Configure: precache app shell, runtime cache for Supabase API calls, offline fallback page. | M |
| B5 | Add iOS splash screens | `index.html`, `public/splash/` | Generate splash screen images for iPhone 13 Pro (1170x2532) and other common sizes. Add `apple-touch-startup-image` link tags. | M |
| B6 | Add offline fallback UI | New `src/components/OfflineIndicator.tsx` | Detect `navigator.onLine` and show a banner when offline. Cache critical assets for offline viewing of last-loaded data. | M |
| B7 | Handle safe area insets | `src/index.css` | Add `padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)` to the root layout for iPhone notch support. | S |

### Phase C: UX Improvements (mobile responsive, better stats, navigation)

| # | Task | Files | What to do | Complexity |
|---|------|-------|------------|------------|
| C1 | Add user greeting + logout to header | `src/pages/Index.tsx` | Read `user_name` from localStorage. Show "Ola, {name}" in header. Add a logout button that clears localStorage and navigates to `/`. | S |
| C2 | Fix light mode styling | `src/index.css` | Redesign the `.glass` class for light mode: use proper shadows, subtle borders, and appropriate opacity values. Adjust neon effects to be subtle in light mode. | M |
| C3 | Improve MonthFilter with quick jump | `src/components/MonthFilter.tsx` | Add a dropdown/select between the arrow buttons that lists available months for quick navigation. | S |
| C4 | Show transaction section even when month is empty | `src/pages/Index.tsx:195` | Always render the filter bar + search. Show a friendly empty state: "Nenhuma transacao neste mes. Adicione sua primeira!" with a CTA button. | S |
| C5 | Optimize DFC chart for mobile | `src/components/DFCChart.tsx` | Use `useIsMobile()` hook. On mobile: reduce chart height to 280px, hide right Y-axis, use abbreviated number format, reduce bar size. | M |
| C6 | Fix stats card overflow on mobile | `src/pages/Index.tsx`, `src/components/StatsCard.tsx` | Truncate long description text with `truncate` class. Use smaller font sizes on mobile for currency values. Add `text-sm` responsive variants. | S |
| C7 | Add swipe gestures for month navigation | `src/pages/Index.tsx` | Add touch event handlers (or a lightweight swipe library) so users can swipe left/right to change months on mobile. | M |
| C8 | Create shared currency formatter utility | New `src/lib/format.ts` | Extract `formatCurrency` into a shared utility. Import it everywhere instead of re-creating `Intl.NumberFormat` per component. | S |
| C9 | Add transaction form auto-scroll | `src/pages/Index.tsx` | After successful `addTransaction`, scroll to the transaction list section using `scrollIntoView`. | S |
| C10 | Improve AI Assistant empty state for mobile | `src/components/AIAssistant.tsx` | On mobile, collapse the AI assistant by default (show only the header). Expand on tap. Reduce suggestion button sizes. | S |

### Phase D: Performance (code splitting, lazy loading, bundle optimization)

| # | Task | Files | What to do | Complexity |
|---|------|-------|------------|------------|
| D1 | Add route-level code splitting | `src/App.tsx` | Wrap page imports with `React.lazy()` + `Suspense`. Split Login and NotFound into separate chunks. | S |
| D2 | Remove 34 unused shadcn/ui components | `src/components/ui/` | Delete: accordion, alert-dialog (keep if used for A4), alert (keep if used), aspect-ratio, avatar, breadcrumb, calendar, carousel, chart, checkbox, collapsible, command, context-menu, drawer, form, hover-card, input-otp, menubar, navigation-menu, pagination, popover, progress, radio-group, resizable, scroll-area, select, sidebar, slider, switch, tabs, textarea, toggle-group. Keep only what's imported. | M |
| D3 | Remove unused dependencies | `package.json` | Remove: `next-themes` (after A9), `input-otp`, `cmdk`, `embla-carousel-react`, `react-day-picker`, `react-resizable-panels`, `vaul`. These are only used by deleted UI components. | S |
| D4 | Delete dead files | Multiple | Delete: `src/App.css`, `src/components/NavLink.tsx`, `src/components/ui/use-toast.ts` (duplicate), `src/pages/Connection.tsx` (if removing per A1). | S |
| D5 | Add React.memo to expensive components | `src/components/DFCChart.tsx`, `src/components/TransactionList.tsx`, `src/components/MonthlyTable.tsx`, `src/components/StatsCard.tsx` | Wrap these components with `React.memo()`. Add `useMemo` for sorted transactions in TransactionList. | S |
| D6 | Optimize font loading | `src/index.css`, `index.html` | Move Google Fonts from CSS `@import` to `<link>` tags in `index.html` with `rel="preconnect"` and `display=swap`. Eliminates render-blocking CSS import. | S |
| D7 | Add React.StrictMode | `src/main.tsx` | Wrap `<App />` in `<React.StrictMode>` for development-time checks. | S |
| D8 | Lazy load PDF parser | `src/components/BankStatementUpload.tsx` | The pdf.js import in statement-parser is already dynamic, but ensure Vite doesn't eagerly resolve it. Add explicit chunk naming: `import(/* webpackChunkName: "pdf" */ 'pdfjs-dist')`. | S |
| D9 | Optimize favicon | `public/` | Compress `favicon.png` from 423KB to < 10KB. Generate proper favicon.ico at 32x32. | S |
| D10 | Configure Vite build optimization | `vite.config.ts` | Add `build.rollupOptions.output.manualChunks` to split vendor chunks (react, recharts, supabase, radix). Target: main chunk < 300KB. | M |

---

## Summary

| Category | Critical | High | Medium | Low | Total |
|----------|----------|------|--------|-----|-------|
| Bugs | 2 | 3 | 5 | 4 | 14 |
| UX Issues | - | - | - | - | 10 |
| Perf Issues | - | - | - | - | 9 |
| PWA Gaps | - | - | - | - | 9 |

### Priority Order
1. **Phase A** (Critical Fixes) -- 10 tasks, mostly S complexity. Fix broken features and data safety issues first.
2. **Phase B** (PWA) -- 7 tasks, mix of S/M. Essential for the iPhone 13 Pro "web app" experience.
3. **Phase C** (UX) -- 10 tasks. Polish the user experience, especially for mobile.
4. **Phase D** (Performance) -- 10 tasks. Reduce bundle from ~1.5MB to under 500KB.

### Estimated Total Effort
- Phase A: ~4-6 hours
- Phase B: ~6-8 hours
- Phase C: ~8-10 hours
- Phase D: ~4-6 hours
- **Total: ~22-30 hours of focused development**
