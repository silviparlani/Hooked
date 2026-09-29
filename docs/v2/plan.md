# Hooked v2 — Implementation and verification plan

Status: Implemented locally; automated checks passed. Ready for user code review. Not deployed.
Date: 2026-09-27
Design: [design.md](design.md)

## Review process

The user is product manager and code reviewer. All product questions were resolved before the user requested implementation. That instruction superseded the earlier proposal to stop for a separate sketch approval. The working UI and screenshots are the reviewable result. Root design.md and plan.md remain the v1 record; docs/v2 records this version.

## 0. Requirements

- [x] Record all journal, ordering, reference-photo, stock, precision, conversion, historical Made, and connectivity decisions.
- [x] Preserve v1 documents and make changed behavior explicit.
- [x] Implement the agreed UI for review rather than stopping at page sketches.

## 1. Persistence and accounting

- [x] Store skein balances and consumption in integer thousandths; reject unsupported precision, negative stock, and invalid conversions.
- [x] Use stable stash IDs and immutable label snapshots for each incremental usage entry.
- [x] Atomically persist usage, stock delta, reference counts, and revisions with Firestore transactions and matching rules.
- [x] Protect retry submissions and stale corrections; reject stale stock forms.
- [x] Keep historical Made entries stock-neutral through correction/deletion.
- [x] Keep depleted yarn visible and block deletion of linked yarn.
- [x] Lock project deletion, refund entries resumably, clean associated records, then delete the project.
- [x] Add a progress-note timestamp without inventing historical note dates.
- [x] Keep legacy readers working and require explicit stash setup before linked consumption; no automatic data reconciliation.

## 2. Journal and media

- [x] Shared one-page journal with opening index, page-turn animation, Previous/Next controls, and touch navigation.
- [x] Latest-update order for Someday/WIPs, latest-completion order for Made, existing Stash order; remove project reorder interaction.
- [x] WIP summary opens the existing work screen; descriptions/notes wrap and auto-grow.
- [x] Made cover is the first remaining completed photo; remaining photos swipe horizontally without turning the journal page.
- [x] Keep one reference image separate from the five completed images, including lifecycle retention and cleanup.
- [x] Yarn-coloured stash pages with conversions, quantities, and hook details.
- [x] Check desktop and iPhone-sized layout, long notes, reduced motion, and gesture separation in browser tests.

## 3. Materials and lifecycle

- [x] Add fractional usage from Stash; show project and per-yarn skein totals, recorded conversions, and per-unit physical totals.
- [x] Correct/remove individual entries, with refunds for consumed yarn and no stock effects for historical Made records.
- [x] Require internet for stock/material transactions and keep unsaved input visible on failure.
- [x] Preserve materials on completion without double deduction.
- [x] Reactivate as a new WIP with zero usage and current stash choices.
- [x] Keep earlier material notes distinct from linked usage and avoid fabricated historical totals.

## 4. Verification

Final verification results:

- [x] TypeScript check and lint.
- [x] Production build.
- [x] 79 application tests.
- [x] 28 Firebase emulator tests: real transaction retries/concurrency, refunds, historical records, stock guards, stale edits, ownership, snapshots, reactivation, and photo limits/concurrent upload handling.
- [x] 16 journal browser tests across desktop and iPhone-sized Chromium.
- [x] 2 existing authentication E2E browser tests.
- [x] Visual inspection of iPhone-sized journal screenshots; captures are linked from design.md.
- [x] Final static/application/Firebase/build checks passed after the refinements, including simultaneous completion/usage and journal timestamps for working changes.
- [ ] Real iPhone Safari/PWA and live Cloudinary camera/upload/delete checks before release.

Generated deployment copies under app/.openai are excluded from lint, TypeScript, and application tests. Journal and E2E browser tests use separate output directories to prevent their artifact cleanup from interfering. No dependency was added. Use npm run test:journal for the journal checks; test:reorder remains as a compatibility alias.

## Review map

| Area | Main files |
| --- | --- |
| Journal navigation and styling | app/components/journal/journal.tsx; app/components/projects/project-list.tsx; app/app/globals.css |
| Notes and project integration | project-editor.tsx; growing-textarea.tsx |
| Usage UI and exact arithmetic | materials-used.tsx; app/lib/domain/materials.ts |
| Stock and lifecycle persistence | materials-repository.ts; inventory-repository.ts; project-repository.ts; project-parts-repository.ts; app/firestore.rules |
| Reference/finished photos | project-photos.tsx; journal-photos.tsx; project-photo-repository.ts; app/app/api/photos/delete/route.ts |
| Stash setup | app/components/inventory/stash.tsx; app/lib/domain/inventory.ts |
| Verification | app/tests/materials-used.test.tsx; app/tests/firebase/materials.test.ts; app/tests/firebase/project-photos.test.ts; app/tests/browser/journal.spec.ts; updated existing tests |

## Release review still pending

- [ ] User code/UI review.
- [ ] Confirm real-device and media integration checks.
- [ ] Deploy new rules and application together in the documented order; refresh old installed clients.
- [ ] User reconciles existing stock/material data after implementation, as requested.

No production data, credentials, deployment settings, or external accounts were changed. Work remains uncommitted for review.

Local verification logs are saved under app/test-results/verification/ (ignored generated artifacts). UI captures for review are in docs/v2/screenshots/.

## Zero-cost release requirement

See [costs.md](costs.md). Verify the three provider free plans before deployment; do not enable billing or paid upgrades. Local deployment dry-run passed on 2026-09-27, but Cloudflare sign-in and account-plan verification remain pending.

## Live deployment update (2026-09-27)

Firestore rules and v2 Worker deployed to https://hooked.silviparlani-05.workers.dev. Production build and HTTP page smoke checks passed. Firebase billing disabled; Cloudinary Free verified; Workers Free confirmed by owner. Real-device checks remain. Photo deletion runtime credential setup is pending explicit approval after automatic review blocked secret transfer. Work remains uncommitted; this was a direct CLI deployment.

## Photo API configuration completed

The owner explicitly approved transferring the existing five Firebase/Cloudinary configuration values to the Hooked Worker as encrypted secrets. All five uploads succeeded. Live checks returned HTTP 401 for both missing and invalid authentication, replacing the earlier missing-configuration 503; the home page returned HTTP 200. No user photos were accessed or deleted during these checks. Actual authenticated photo deletion remains a user acceptance check. No billing plan was changed. This resolves the credential-setup blocker recorded above.

## On the Hook visual trial

Implemented the WIP-only spiral binding, pastel-green paper, measured index pagination, in-book New WIP action, and swipe/keyboard navigation. Removed the index ornament and little-book subtitle for WIPs only. Browser verification: 18 tests passed on desktop and iPhone-sized Chromium, including pagination, gestures and unchanged other journals. Actual iPhone Safari acceptance remains with the owner.

### Trial release verified — 2026-09-29

The previously started Cloudflare deployment completed successfully: version 499e2343-efb5-4272-8c20-833d6917c926. Verified the live /wips response (200), the WIP trial markers in its deployed scripts, and the photo API invalid-token guard (401). Final lint and TypeScript checks passed, and all 18 desktop/iPhone-sized journal browser tests passed after the semantic HTML refinement. No additional deployment, billing change, or production data mutation was needed during this verification. Owner review on real iPhone Safari remains.

### WIP motion revision

Removed the WIP page-turn and spiral-ring animations at the owner's request. Pages switch immediately when swiping or using keyboard navigation. Pastel paper, spiral binding, pagination and all other journal behavior remain. Other sections are unaffected.

## Shared approved book layout

Expanded the approved On the Hook layout to Someday, Made and Stash. All four now use components/journal/journal.tsx; the WIP-only component was consolidated. Each index paginates to available height, has its add action inside the book, and supports swipes and keyboard arrows without flip animations or bottom ornaments. Project books use pastel-green paper; stash yarn pages retain inventory colours. Long project details and editing forms retain their needed scrolling. Photo galleries opt out of page swipes and retain native horizontal scrolling. No data model, security rules, dependencies, billing or services changed.

Shared book release deployed: 12df217e-0387-47d7-8315-1f3bcc373b59. Verification passed: 79 application tests, 18 desktop/mobile browser checks, TypeScript, lint and production build. Live section HTTP smoke checks completed.

## Someday-only reference images — 2026-09-29 (local, not deployed)

Reference controls and uploads are restricted to planned projects. Start deletes the reference asset and metadata before transitioning; failures or concurrent reference uploads block the transition. WIP has no photos, and Made keeps its five-photo gallery. No bulk cleanup or migration is performed. Editor visibility and Firestore lifecycle/rules regression tests cover the revised policy. Mac verification passed with a temporary Java 21 runtime: 82 application tests, 33 Firebase emulator tests (including cleanup failure/retry and atomic upload/start rejection), 18 journal browser tests, 2 authentication browser tests, TypeScript, lint, production build, and Wrangler deployment dry-run. Chromium was installed for browser verification.
