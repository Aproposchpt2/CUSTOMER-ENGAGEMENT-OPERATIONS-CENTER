# STELLAR INTELLIGENT TECHNOLOGIES — Brand Typography Baseline
**Audited:** 2026-10-22  
**Repository:** Aproposchpt2/CUSTOMER-ENGAGEMENT-OPERATIONS-CENTER  
**Source branch:** main  
**Status:** Current code-backed reference; preserve during future design revisions. No CSS changes authorized by this document.

## Source-of-truth precedence
1. `pages/_app.tsx` imports `styles/globals.css`, then `styles/apropos-theme.css`, then `styles/apropos-light-refinement.css` (in that order).
2. `styles/apropos-theme.css` declares the global design tokens and frequently uses `!important`; inspect computed specificity before changing a component.
3. New public marketing pages use `components/MarketingLayout.tsx`, `components/BrandHero.tsx`, and `styles/marketing.module.css`. Their intentionally light display weight is distinct from the global heading rule.
4. Do not assume marketing, authenticated dashboard, and legacy pages share identical responsive size rules.

## Fonts (authoritative global tokens)
```css
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=DM+Sans:wght@300;400;500;600&family=Syncopate:wght@400;700&display=swap');
--theme-display:'Cormorant Garamond',Georgia,'Times New Roman',serif;
--theme-body:'DM Sans',Arial,sans-serif;
--theme-mark:'Syncopate',Arial,sans-serif;
```
- **Cormorant Garamond:** Brand wordmarks, display headlines, H1–H6, editorial titles. Premium serif; do not substitute generic bold sans serif.
- **DM Sans:** Body copy, descriptions, navigation and normal UI text.
- **Syncopate:** Eyebrows, micro-labels, product labels, section kickers and attribution, often uppercase and tracked.
- **Monospace exception:** code/pre/kbd/samp use Courier New/Courier/monospace.
- Theme global body rule `body,body *{font-family:var(--theme-body)!important}` is overridden by targeted title/label selectors. Preserve this distinction.
- `styles/globals.css` has an earlier Inter control font, but theme specificity means do not assume Inter is the rendered default. Test computed styles.

## Global typography
In `styles/globals.css`:
- Body: 15px, line-height 1.65, letter-spacing .005em.
- Base h1: 28px; h2: 22px; h3: 18px (marketing components override them).
In `styles/apropos-theme.css`:
- h1–h6 and headline/brand classes: Cormorant Garamond, **weight 500 !important**.
- Hero h1: letter-spacing **-.015em !important**; weight 500.
- Eyebrow/kicker/label/tag: Syncopate, **weight 400 !important**.
- The global theme is documented as premium, never heavy/bold.

## New public marketing typography (styles/marketing.module.css)
These are CSS-defined intended values; validate final computed values against global `!important` precedence:
| Role | Font | Size | Weight | Letter spacing | Line height |
| --- | --- | --- | --- | --- | --- |
| Hero business name `.heroBrand` | Cormorant Garamond | clamp(21px,3.15vw,45px) | 400 | .045em | 1.2 |
| Hero headline `.heroHeadline` | Cormorant Garamond | clamp(38px,5.7vw,80px) | 400 | -.025em | 1.04 |
| Tagline `.tagline` | Cormorant Garamond | clamp(18px,2vw,25px) | 400 | normal | normal |
| Section h2 `.section h2` | Cormorant Garamond (inherited heading rule) | clamp(38px,5vw,68px) | 400 | -.025em | 1.06 |
| Section h3 | Cormorant Garamond | clamp(26px,3vw,39px) | 400 | normal | 1.12 |
| Hero description | DM Sans | 15px | body default | normal | 1.9 |
| Section paragraph | DM Sans | 14px | body default | normal | 1.95 |
| Micro-labels | Syncopate | 9px (some 7–10px) | 400 | .13em | 1.8 |
| Header brand wordmark | Cormorant Garamond | 26px | 400 | .14em | 1.1 |
| Header subtitle | Syncopate | 7px | regular | .15em | normal |

**Important cascade caveat:** The global theme's `body h1`, `body h2` … `font-weight:500!important` can win against the CSS module's `font-weight:400!important` on semantic headings (depending on actual matching selectors). `.heroBrand` is a paragraph so its 400 rule is straightforward. Verify computed weight on a deployed preview before asserting visible headline weight.

### Marketing mobile (max-width:700px)
- Hero business name: 27px.
- Hero headline: clamp(37px,8.2vw,55px).
- Tagline: 19px.
- Section h2: 42px.
- Hero description: 13px.
- Header brand: 23px.
- Micro-label: 8px.

## Color context — do not silently recolor
`styles/apropos-theme.css` currently defines:
- Canvas #050505; section #0A0A0A; surface #101010.
- Main text #F7F4EC; secondary #D3CEC1; muted #9E988B.
- Gold accent #C8A84B; lighter gold #E4C878.
- Brand site palette: black / gold / ivory-white.
Older `--apropos-*` tokens coexist in `globals.css`; prefer current `--theme-*` references for public marketing, preserving existing appearances.

## Required preservation rules for future work
1. Business name **STELLAR INTELLIGENT TECHNOLOGIES** is prominent and precedes hero message.
2. Attribution: **OPERATED BY APROPOS GROUP LLC** where the current component supplies it.
3. Never replace the type trio without explicit owner approval.
4. Preserve differences between globally themed legacy pages and newer marketing components; do not mass-edit headings to bold.
5. Preserve tracking, leading, case, gold accents, font fallbacks, responsive sizing, and semantic hierarchy.
6. Any redesign must include before/after screenshots on desktop and mobile, browser computed font-family/weight checks, and regression checks for header/hero/section/card/footer.
7. Keep production deployment and existing CSS untouched without separate owner approval.

## Audit sources
- `styles/apropos-theme.css`
- `styles/globals.css`
- `styles/marketing.module.css`
- `pages/_app.tsx`
- `components/MarketingLayout.tsx`
- `components/BrandHero.tsx`
- `docs/STELLAR-SITE-RESTRUCTURE-REVIEW.md`

**Note:** This is a source audit, not a live-browser computed-style verification. Where CSS rules overlap, runtime specificity must be checked.
