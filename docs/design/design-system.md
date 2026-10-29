# MOMENT · Ticketing V3 design system

## Provenance and scope
The visual identity follows actual `ticketing-service/dev@18fc1fba1b4b6c0bbed5abcfb541c35d9ca5f334`, especially SiteHeader, PerformanceList/Card, detail and session components. See [source and render analysis](reference-analysis.md). This is a V3 presentation system, not a copy of reference authentication/booking rules. V2 could not be read. No external poster/icon/font assets or new product dependency were introduced.

## Tokens
Implemented in `frontend/app/globals.css`; shared primitives/layout consume the tokens rather than redefining a separate theme for each role.

| Purpose | Token/value | Usage |
|---|---|---|
| Primary | `--primary:#6a49c8`, hover `#5939b7`, soft `#f0ecf9` | Actions, selection, brand, guide surfaces |
| Surface | background `#f8f7f4`, white surface, muted `#faf9fb` | Calm consumer background and focused forms |
| Text | primary `#24212d`, secondary `#69636e`, muted `#756d7e` | Hierarchy without overly pale small text |
| Border | `#e9e6e1`, stronger `#d8d1e2` | Dividers and controls, not a box around every line |
| Semantic | success `#26734d`, danger `#a33d4c`, warning `#946322`, pale paired surfaces | Server states with text labels, never color alone |
| Space |4/8/12/16/24/32px | Shared gaps/padding; larger layout spacing remains context-specific |
| Radius | control12px, card18px, panel24px | Input/button, poster card, search/detail surfaces |
| Shadow | card `0 6px 22px #1f1e2d08`, lift `0 14px 35px #1f1e2d14` | Subtle interaction, not heavy depth everywhere |
| Content |1200px max width | Header, main content and footer alignment |

System Korean-capable fonts (Arial/Noto Sans KR fallback/sans-serif), no remote font fetch. Body14px/1.65, consumer hero38px desktop/28px narrow, normal headings36/24/17px adjusted by layout. Supporting labels remain secondary; essential prices/headings stay prominent. Primary controls are44px minimum height; compact header controls are smaller but retain padding/gaps. Focus outlines are3px with4px offset; selected controls have visible border/surface and aria state. Reduced-motion preference removes nonessential transitions/spinner animation.

Contrast correction was based on measured WCAG relative luminance: old muted `#817a89` on white4.14:1 was insufficient for small text. Final `#756d7e` is4.95:1 white,4.71:1 muted surface,4.62:1 page background. Automated regression reads the real CSS token. This is a targeted check, not full WCAG/screen-reader certification.

## Components and boundaries
- `ui.tsx`: labelled Field/Panel, Notice, Loading, Empty, Status, Poster and Dialog, reused in real views. No unused universal component framework.
- `workspace.tsx`: shared Header/Navigation/Footer, role view selection, focused authentication dialog. API/session logic remains in original client.
- `buyer.tsx`: composition only; `use-buyer.ts` preserves data/safety state and request ordering; `buyer-views.tsx` renders discovery/detail/restore/checkout/history.
- `seat-map.tsx`: existing server seats grouped only by recognizable label prefix; no new IDs, prices, grades or missing-seat inventory. Unknown labels use an original-order fallback.
- `management.tsx`: same tokens, operational density; explicit seller tasks and one selected performance; admin record list/detail plus confirmation.

Field labels use generated IDs/explicit htmlFor. Status values map existing enums to Korean display only. Dialog has labelled modal semantics, Tab containment, Escape, background inert/scroll lock and opener restoration; no API action until confirmation. A dialog is a safety step, not a new review state.

## Responsive behavior
- Above1050px: three poster columns, detail/booking main content plus320px aside, operational list/detail.
- Up to1050px: smaller290px asides and reduced gaps; schedule forms stack where needed.
- Up to800px (tested768): two poster columns; detail/booking stack, session cards may share a row; header navigation wraps.
- Up to580px (tested390): horizontal poster cards and one-column operations/checkout. Seat rows keep their real label order inside a separately focusable horizontal canvas instead of inventing wrapped physical rows. Page body must not overflow.

Actual acceptance sizes are390,768,1440px. Screen captures and geometry checks are in the redesign report; they are more meaningful than claiming responsiveness from media queries alone.

## Honest content and interaction
V3 has no category/official-poster/sale-availability field in public catalogue DTO: no fabricated genre filters, stock counts, on-sale badges or official artwork. CSS poster fallback says no official poster. Gradients/rings are neutral decoration; three hue variations do not encode metadata. Prices, statuses, seat IDs and totals always come from actual API data. API error codes remain available for existing401/403/409 handling.

Buyer flow clearly separates discovery→detail/session→seat/hold→mock payment→history. Login is not a full-width obstruction before the catalogue. Active holds are server-listed and explicitly restored without client credentials/state storage or expiry extension. Failed-payment retry restrictions and all Issue #1 async/CSRF/idempotency protections remain.

Seller tasks mirror available APIs: venue→performance→session/shared sale. New performance already enters PENDING; there is no fake review-request action. Existing sale periods are unavailable in the read DTO, so the form warns the operator to check dates before saving instead of showing invented values. Admin displays only actual record fields and confirms approve/reject; no fake applicant/rejection-reason or re-review policy.

Single App Router root route and local views are retained to avoid replacing transaction state/routing semantics during visual work. Deep-linkable per-view URLs are a possible future change, requiring the same restoration tests. Cancellation/refund/resale/payment retry/approval-after-session-add policies remain separate decisions.

Checkout presentation: a new selection hides a previous terminal checkout without discarding transaction/idempotency state. During a same-session active hold the summary uses server hold seat IDs/count/total, preventing a misleading zero selection above the payment panel.
