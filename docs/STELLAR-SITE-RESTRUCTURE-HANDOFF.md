# STELLAR website restructuring — execution handoff

Status: implementation preserved for review; **not production-ready or released**.
Owner: Jeffery Mitchell / Apropos Group LLC. Date: October 20, 2026.
Repository: `Aproposchpt2/ai4-contact-center`.
Working branch: `feature/stellar-brand-product-architecture`.
Production starting point: `main`, commit `7c9fd3e7b1e352f878d5295ebb805361400296dd`.

## 1. Preserve the approved direction

- Exact brand: **STELLAR INTELLIGENT TECHNOLOGIES**.
- Exact attribution: **Operated by APROPOS GROUP LLC**.
- Business name is the first line of each hero, in elegant regular-weight display typography, never bold.
- Supporting statement: **Intelligent Technology for the Workplace**.
- Main philosophy: **TECHNOLOGY HANDLES THE PREDICTABLE. STAFF HANDLE THE EXCEPTIONAL.**
- Retain the established Apropos black/gold/white presentation and existing typography: Cormorant Garamond display, DM Sans body, Syncopate labels. Do not substitute a generic template.
- The website must showcase modernization, ingenuity, and innovation. Use meaningful interaction and visual hierarchy, accessible controls, responsive layouts, and restrained motion.
- Three distinct products: the **Customer Engagement Operations Center** is the foundational product; the **Sales Service System** and **Support Specialist Service System** sit on that foundation.
- The future **Business Management and Operations** platform combines systems as they develop. Present this as future direction, not a currently available complete product.
- Maintain informational, soft-consultation-led copy. Never invent capabilities, results, deployment readiness, testimonials, or pricing. Public usage pricing must remain customer-centered; do not reveal per-minute rates.

## 2. Resume the preserved implementation

Do not start a new site or discard the existing work. Inspect the branch and diff first.

Implemented source:

- `pages/index.tsx`: overarching brand homepage, product collection, future direction, FAQs, consultation links.
- `pages/products/index.tsx`: product directory.
- `pages/products/customer-engagement-operations-center.tsx`.
- `pages/products/sales-service-system.tsx`.
- `pages/products/support-specialist.tsx`.
- `pages/about.tsx`: revised brand perspective.
- `components/MarketingLayout.tsx`, `BrandHero.tsx`, `BrandSignature.tsx`: shared public navigation, hero hierarchy, attribution, footer.
- `components/SystemExplorer.tsx`: interactive, accessible product architecture selector.
- `components/MarketingProductPage.tsx`, `lib/marketingProducts.ts`, `lib/salesFaqs.ts`: product narratives, capabilities, sequences, related products, and retained Sales FAQs.
- `styles/marketing.module.css`: scoped responsive presentation using the established theme.
- `pages/demo.tsx`, `pages/intake.tsx`: existing public journeys wrapped in the new marketing shell; no form/API behavior deliberately replaced.
- `components/SearchMetadata.tsx`, `public/sitemap.xml`, `public/stellar-intelligent-technologies-share.svg` and `.png`: brand/product metadata and sharing image.
- `components/Header.tsx`, `components/Footer.tsx`: public fallback name and operator attribution.
- `utils/supabase/middleware.ts`: public product routes.
- `lib/tenantHost.ts`: product marketing blocked on tenant/operator hosts.
- `middleware.ts`: preserve demo-entry cookie behavior when entered from the Sales product page.
- `tests/tenantHost.test.mts`: additional product-route boundary regression.

Existing URL architecture stays intact: root public site, `app.stellaruc.com` workspace finder, customer subdomains, internal admin hosts. Do not repurpose customer hostnames as product subdomains. Preserve the legacy `/api/*` exception in `netlify.toml` and all authentication/tenant boundaries.

## 3. Use existing verification evidence

The orchestrating agent reported:

- TypeScript check passed before the final small signature/metadata edits.
- A production build completed successfully. A later build was launched after those edits; its final status must be established from available evidence, not inferred.
- All **14 hostname-routing tests passed**, including the added product-route regression.
- Full baseline test suite: **96 of 98 pass** on unchanged production commit `7c9fd3e`. Two existing `voiceBridgeRuntime` failures concern seeded greeting context and the approved support instructions. Do not modify voice behavior or weaken assertions to make this marketing task green.
- Production deployment was verified as Netlify deploy `6ad6c1dfd80abb255bdef5d5` from `main` commit `7c9fd3e` during the initial review. Refresh deployment state only if needed for release.

The handoff agent independently verified `git diff --check` passed and a built `.next/BUILD_ID` exists. Parent `/tmp` logs were not visible to the handoff agent; the existence of a build artifact alone does not prove that the final build succeeded. Check retained orchestrator results or rerun only the checks whose final status cannot be recovered.

Visual QA is **pending**. Direct browser access to localhost failed. The managed preview supervisor added Vite-specific `--host`/`--strictPort` flags unsupported by Next.js. It was stopped. This is a preview tooling limitation; do not change production application code merely to accommodate that wrapper.

## 4. Complete focused QA and necessary corrections

1. Establish a supported review preview of this branch with production-equivalent routing and configuration; keep secrets in the environment.
2. Review desktop, tablet, and mobile layouts. Confirm the business name is first in each hero and remains regular-weight. Inspect hierarchy, spacing, text wrapping, contrast, navigation, and overflow.
3. Test mobile menu open/close and links; keyboard focus and skip link; all architecture selector buttons and their corresponding product links; FAQ controls; reduced-motion behavior.
4. Verify each new public route loads while signed out, has the correct page title/canonical/indexing, and remains blocked on tenant/operator/app hosts as intended. Preserve normal workspace/login/API behavior.
5. Check existing Sales demo navigation and demo-session cookie behavior from the homepage and Sales page. Check the consultation form's layout and client validation **without submitting real leads, making calls, booking appointments, or sending notifications**.
6. Review old `/platform`, `/platform/*`, `/partners`, and `/acquisition` entry points for inconsistent branding/navigation or outdated claims. Make an explicit compatibility decision before redirecting or replacing them. Do not delete working routes or expose internal operational tools.
7. Validate product copy against current evidence. Support deployment readiness is not established by this marketing work; its page intentionally directs visitors to discuss configuration and readiness.
8. Run appropriate TypeScript/build checks after necessary fixes, and the relevant route tests. Record the two baseline voice failures separately if the full suite is run. Do not repeat completed voice acceptance tests.
9. Update this handoff with verified preview URL, exact commit, checks, unresolved issues, and screenshots suitable for owner review.

## 5. Final owner review gate

Provide the owner one concise review package: working preview, desktop/mobile screenshots, three-product navigation, validation summary, exact branch/commit, and any remaining limitations. Obtain approval for the concrete production release after review.

**Do not merge, publish to production, change DNS, change access controls, or modify databases as part of this handoff.** PR #77 (`feature/staging-orchestrator-trigger-gateway`) remains draft and unmerged and must not be altered. This marketing branch is separate from that work. No voice model, prompt, bridge, or production telephony changes belong in this task.

The execution agent performs the implementation and reports evidence. The orchestrator uses this chat for product decisions and review. Delegation inside a Work session still consumes session resources; running this handoff in the owner's existing external development environment can keep implementation activity out of this conversation.
