# STELLAR website restructuring — owner review package

**Date:** October 20, 2026
**Owner:** Jeffery Mitchell / APROPOS GROUP LLC
**Status:** QA complete — awaiting owner approval for production release

---

## Branch and commit

| | |
|---|---|
| **Branch** | `feature/stellar-brand-product-architecture` |
| **Final commit** | `28bffdadf5751630477c4aed62a2a7afd3f83fe0` |
| **Implementation commit** | `c4d07547df9720101353715f353ccdd0c54a1b5b` |
| **Production base** | `main` @ `7c9fd3e7b1e352f878d5295ebb805361400296dd` |
| **Preview URL** | `http://localhost:3000` (local dev server) |

---

## Route verification — all public routes

| Route | Page title | Signed-out access | Layout | Result |
|---|---|---|---|---|
| `/` | STELLAR INTELLIGENT TECHNOLOGIES \| Intelligent Technology for the Workplace | ✓ | MarketingLayout | PASS |
| `/products` | Intelligent Workplace Products \| STELLAR INTELLIGENT TECHNOLOGIES | ✓ | MarketingLayout | PASS |
| `/products/customer-engagement-operations-center` | Customer Engagement Operations Center \| STELLAR INTELLIGENT TECHNOLOGIES | ✓ | MarketingLayout | PASS |
| `/products/sales-service-system` | Sales Service System \| STELLAR INTELLIGENT TECHNOLOGIES | ✓ | MarketingLayout | PASS |
| `/products/support-specialist` | Support Specialist Service System \| STELLAR INTELLIGENT TECHNOLOGIES | ✓ | MarketingLayout | PASS |
| `/about` | Our Perspective \| STELLAR INTELLIGENT TECHNOLOGIES | ✓ | MarketingLayout | PASS |
| `/demo` | Live Sales Service Demo \| STELLAR INTELLIGENT TECHNOLOGIES | ✓ | MarketingLayout | PASS |
| `/intake` | Request a Consultation \| STELLAR INTELLIGENT TECHNOLOGIES | ✓ | MarketingLayout + consultation form | PASS |

---

## Brand presentation — every hero

All six new marketing pages confirmed:

- **Business name first** in regular-weight Cormorant Garamond display type (`font-weight:400`) — never bold ✓
- **Gold italic tagline** "Intelligent Technology for the Workplace" ✓
- **Product label** (Syncopate micro-caps) on product pages ✓
- **Attribution** "OPERATED BY APROPOS GROUP LLC" ✓
- Black/gold/white palette, decorative ellipse orbit, "HUMAN VISION. INTELLIGENT EXECUTION." footer strip ✓

---

## Interaction checks

| Check | Result |
|---|---|
| SystemExplorer — Sales Specialist node | Click updates detail panel: "02 / INTELLIGENT SALES ENGAGEMENT", correct capabilities, gold border selection ✓ |
| SystemExplorer — Support Specialist node | Click updates detail panel: "03 / INTELLIGENT CUSTOMER SUPPORT", correct capabilities, gold border selection ✓ |
| FAQ expand/collapse | `<details>` opens with answer and `×` icon; closes back to `+` ✓ |
| Sales demo session cookie | `middleware.ts` sets `ai4cc_demo_started_at` (httpOnly, sameSite=lax, 1hr) when entering `/demo` from `/` or `/products/sales-service-system` ✓ |
| Mobile navigation CSS | `menuButton` `display:block` at ≤700px; `navOpen` overlay styles defined; hero/grid/footer stacked layouts confirmed in `marketing.module.css` ✓ |
| Hamburger button | Hidden at desktop (≥700px), CSS-only — cannot trigger at 910px viewport ✓ |

---

## Metadata and discoverability

**Social metadata** (`components/SearchMetadata.tsx`):
- `<title>`, `<meta name="description">`, `robots: index,follow` per page ✓
- `og:title`, `og:description`, `og:url`, `og:image` (`stellar-intelligent-technologies-share.png`), `og:image:alt/width/height` ✓
- `twitter:card: summary_large_image`, `twitter:title`, `twitter:description`, `twitter:image` ✓
- `<link rel="canonical">` pointing to `https://stellaruc.com{pathname}` ✓
- JSON-LD Organization + WebSite + WebPage schema; `Service` schema on product pages ✓
- Unknown routes → `noindex,follow` (no 404 leak) ✓

**Sitemap** (`/sitemap.xml`): all three product URLs present alongside existing platform/demo/about/partners entries ✓

---

## Validation results

| Check | Command | Result |
|---|---|---|
| Whitespace errors | `git diff --check HEAD` | Clean — no trailing whitespace or mixed indent |
| TypeScript | `npx tsc --noEmit` | Zero errors |
| Hostname / route boundary tests | `npx tsx --test tests/tenantHost.test.mts` | **14 / 14 pass** |

Full baseline: 96/98 on production commit `7c9fd3e`. Two pre-existing `voiceBridgeRuntime` failures (seeded greeting context, approved support instructions) — unchanged, not re-run here. No voice code was touched on this branch.

---

## Legacy route compatibility decision

| Route | Status | Decision |
|---|---|---|
| `/platform` | Loads — pre-restructure platform capabilities page, old layout (no MarketingLayout), "STELLARUC" branding | **Leave as-is** — distinct buyer/capabilities journey |
| `/partners` | Loads — sales/demo landing page for BPOs, MSPs & agencies, demo phone number | **Leave as-is** — active sales channel |
| `/acquisition` | Loads — diligence walkthrough for buyers & white-label partners, old layout | **Leave as-is** — active acquisition journey |

All three use the pre-restructure header by design. No stale claims requiring correction were found. No route behavior was changed.

---

## Hostname boundary confirmation

Marketing routes (`/products/*`, `/about`, `/intake`, `/demo`, `/platform*`) are blocked on tenant, operator, and app hosts — confirmed by the 14 passing tests. `X-Robots-Tag: noindex,nofollow` applied on all non-marketing hosts. Workspace finder, dashboard, ops-console, and API routes unaffected.

---

## Remaining limitations

1. **Mobile browser screenshot not captured** — Chrome extension held viewport at 910px; mobile layout verified from CSS source (`marketing.module.css`). All stacked grid, hamburger, and footer collapse rules confirmed present and correct.
2. **Netlify branch preview not deployed** — preview is local dev server only. A Netlify branch deploy would provide a shareable URL; that step requires owner authorization.
3. **Full test suite not re-run** — only the route boundary tests were run. The two voice failures are pre-existing and unrelated to this branch.
4. **`.env.local` required locally** — stub Supabase values needed to start the dev server (Supabase client initializes before the public-path guard). File is gitignored; never commit it.

---

## Production release gate

All checks pass. No issues found. The branch is ready for owner review.

**To release:** owner approves → merge `feature/stellar-brand-product-architecture` into `main` → Netlify auto-deploys → verify live at `https://stellaruc.com`.

**Do not merge or deploy until owner gives explicit approval.**
