# STELLAR restructuring — coding agent next steps

Copy the entire instruction block below into the external coding agent. Owner authorized continued implementation and a review preview. Production release requires separate owner approval.

```text
CODING AGENT EXECUTION BRIEF — STELLAR WEBSITE RESTRUCTURING
Owner: Jeffery Mitchell / APROPOS GROUP LLC
Date: October 20, 2026

MISSION
Finish the existing three-product marketing website implementation, correct verified issues, and deliver a working review preview. Work autonomously through the authorized steps and provide one final review package to conserve the owner's Work session. Do not stop after writing a plan.

1. RECOVER THE EXISTING WORK
Repository: Aproposchpt2/ai4-contact-center
Branch: feature/stellar-brand-product-architecture
Implementation commit: c4d07547df9720101353715f353ccdd0c54a1b5b
Primary handoff: docs/STELLAR-SITE-RESTRUCTURE-HANDOFF.md

Inspect repository instructions and working-tree status first. Preserve unrelated local changes.
Verify the remote points to the correct repository, then fetch origin and check out the existing branch. If already on it, update with a fast-forward only when the working tree permits. Do not recreate the implementation or overwrite another agent's changes.
Read the primary handoff and inspect the actual branch diff before editing.
If the branch is missing locally, check remote configuration and fetch refspecs. Report exact access errors if recovery fails; do not treat a stale local checkout as proof that GitHub content is missing.

2. PRESERVE THE APPROVED PRESENTATION
Exact brand: STELLAR INTELLIGENT TECHNOLOGIES
Exact attribution: Operated by APROPOS GROUP LLC
The business name is the FIRST LINE of every hero, in elegant regular-weight display typography, never bold.
Supporting statement: Intelligent Technology for the Workplace
Main philosophy: TECHNOLOGY HANDLES THE PREDICTABLE. STAFF HANDLE THE EXCEPTIONAL.
Retain Apropos black/gold/white colors and established typography:
Cormorant Garamond display, DM Sans body, Syncopate labels.
The site is a showcase of modernization, ingenuity, and innovation. Preserve the custom presentation and meaningful interaction; refine weak execution rather than replacing it with a basic template.
Keep copy approximately 90% informational with a soft consultation/website invitation.
Do not invent capabilities, testimonials, guaranteed outcomes, or product readiness.
Never expose per-minute usage rates publicly. Explain usage charges from the customer's perspective.

3. PRESERVE THE THREE-PRODUCT ARCHITECTURE
stellaruc.com/ — overarching brand homepage
/products — product directory
/products/customer-engagement-operations-center — foundational product
/products/sales-service-system — Sales service on that foundation
/products/support-specialist — Support service on that foundation

The Customer Engagement Operations Center is a product in its own right.
Show clearly that Sales and Support operate on top of it.
Present the future Business Management and Operations platform as a direction for combining systems as they develop, not as a finished available product.
Retain app.stellaruc.com workspace discovery, customer subdomains, and internal administrator roles. Do not assign product marketing to customer subdomains.

4. COMPLETE FOCUSED IMPLEMENTATION AND QA
Inspect the existing package scripts and runtime requirements; use the repository's supported commands.
Establish a review preview using supported Next.js tooling or the existing nonproduction deployment workflow. A Vite wrapper previously supplied incompatible --host/--strictPort flags; do not alter production code merely to accommodate that wrapper.
Keep secrets in environment configuration and out of source, logs, screenshots, and reports.

Review desktop, tablet, and mobile layouts:
- hero ordering, regular-weight brand text, hierarchy, wrapping, contrast, spacing, and overflow;
- public navigation and mobile menu;
- keyboard focus, skip link, accessible architecture selector, matching product links;
- FAQs, reduced-motion behavior, consultation links, and footer.

Verify signed-out access to homepage, product directory, all three product pages, about, demo, and intake.
Verify titles, canonical URLs, sitemap, social metadata, and indexing.
Confirm marketing routes retain the intended tenant/operator/app hostname boundaries.
Preserve the legacy /api/* hostname exception, authentication callbacks, workspace behavior, and operational routes.
Verify Sales demo entry/session-cookie behavior from both homepage and Sales product page.
Inspect intake layout and client validation without submitting a real lead, sending notifications, booking appointments, or making calls.
Review legacy /platform, /platform/*, /partners, and /acquisition for stale branding and broken navigation. Preserve compatibility; explain any proposed redirects before changing route behavior.
Use evidence to check product claims. Do not infer Support production readiness from completion of its marketing page.

5. VALIDATION AND EVIDENCE
The earlier handoff reports 14 passing hostname tests, and a baseline full suite with 96/98 passing on production starting commit 7c9fd3e7b1e352f878d5295ebb805361400296dd.
Those results are historical reported evidence, not proof of the current checkout.
Two reported baseline failures are in voiceBridgeRuntime: seeded greeting context and approved support instructions.
Do not change voice code or weaken tests to make this marketing task pass.
Recover existing logs where available; run TypeScript/build and relevant route checks whose final state is missing or affected by new edits.
Run git diff --check. Record exact commands and results.
Do not repeat voice acceptance calls or unrelated completed tests.
If preview access or required configuration is unavailable, complete independent work and report the exact blocker without claiming visual approval.

6. SAVE AND DELIVER
Commit the authorized marketing corrections and documentation on this restructuring branch and push them to the same repository.
Update docs/STELLAR-SITE-RESTRUCTURE-HANDOFF.md with current evidence and remaining issues.
Create or update docs/STELLAR-SITE-RESTRUCTURE-REVIEW.md with:
- exact branch and final commit;
- working preview URL and deployment identity if available;
- desktop/mobile screenshots for the homepage and each product page;
- checks performed and results;
- interaction/routing findings;
- remaining limitations and owner decisions.
Preserve existing review reports and unrelated work.

Send the owner ONE concise final package: preview link, report link, screenshots, exact commit, validation summary, and material limitations. If blocked, distinguish completed work from blocked work and provide the precise next action.

RELEASE BOUNDARIES
Do not merge or deploy to production.
Do not change DNS, access controls, databases, voice models, prompts, bridge runtime, telephony, or credentials.
Do not alter PR #77 or feature/staging-orchestrator-trigger-gateway; it remains draft and unmerged.
Obtain owner approval for the concrete production release only after the preview and evidence are ready.
```
