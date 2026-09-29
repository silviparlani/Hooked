# Hooked v2 — Product and architecture design

Status: Implemented locally for code review. Automated verification is recorded in plan.md; production release and real-device verification are pending.
Date: 2026-09-27

## Scope and ownership

The user is product manager and code reviewer. This document records the confirmed product rules and implemented technical choices for code review. The root design.md and plan.md remain the v1 record. These v2 decisions supersede v1 only for the changes explicitly listed here. The user authorized implementation after resolving the product questions. No production data migration or deployment has been performed.

## Confirmed journal experience

- Keep the section names Someday, On The Hook, Made, and Stash.
- Display one project or yarn per journal page, sized and tested for iPhone 16 Pro. Include page-turn animation. No project reordering in v2.
- Include an opening index for Someday, On The Hook, Made, and Stash, allowing direct jumps to a project or yarn. Someday and On The Hook use most recently updated first; Made uses most recently completed first. No manual reordering. Stash ordering has no product preference; retain its existing order.
- Made: title, description, completion date, first remaining uploaded photo as cover, and other photos in a horizontal swipe area. Keep the five-photo limit. No cover override.
- On The Hook: title, description, latest progress note and its date. Open the existing project screen to use working sections.
- Description and progress-note editing must resize to accommodate long text; displayed text must wrap and remain reachable without escaping its container. The user reports overflow and this is part of v2 scope.
- Someday: title, description, pattern URL, one manually uploaded reference image, and existing actions such as Start and Delete. Delete the reference image and its Cloudinary asset before starting the project. WIPs have no photo controls. Made permits up to five completed photos and no reference image. No YouTube thumbnail lookup or integration.
- Stash: one yarn per page with name, details, recommended hook size, available skeins, required label conversion, and the existing yarn-derived background colour.
- Existing functionality remains except for removed reordering, the new media support, and the explicit materials/accounting changes.

### Implemented interaction details

Use a shared journal container with Previous/Next controls, touch navigation, page position, and a route back to the index. Keep a single page on larger screens too. Long content scrolls within the page rather than being clipped. Gallery swipes, form input, and vertical scrolling must not accidentally turn journal pages. Respect reduced-motion settings with an immediate or minimal transition. Preserve logical keyboard focus through page changes.

Progress-note date tracks changes to that note rather than unrelated project edits or row-counter activity. Working section/counter changes atomically advance the project updatedAt date used for journal sorting, without changing latestUpdateAt. Existing project.updatedAt cannot establish an accurate historical note date; do not invent one for legacy records.

## Confirmed materials rules

- Rename WIP materials to Materials used.
- Log an additional amount each time, in skeins, with up to three decimal places. Show accumulated usage per yarn. Every new materials entry must select a stash yarn; missing yarn must be added to Stash first.
- Deduct accepted WIP usage from its corresponding stash item. Block amounts exceeding available stock.
- Reducing or removing consumption returns yarn to stash. Deleting a consuming project returns its yarn too, because the expected action is frogging. Discarded yarn is handled by the user manually editing stash.
- Keep zero-stock yarn pages visible. Delete yarn only manually, and block deletion while it is linked to any project.
- Each yarn requires one positive per-skein conversion: weight OR length, retaining label information. Allowed units are grams, metres, and yards only. Conversion is not optional; ounces and custom units are excluded.
- Finished projects preserve their original conversion when stash data later changes.
- Completion retains materials and does not deduct them again.
- Made materials can be corrected after completion.
- Adding an already completed project directly to Made does not deduct stock. Its historical materials remain stock-neutral on correction or deletion. Materials consumed through a WIP continue to adjust stock on correction/deletion after completion.
- Reactivation creates fresh usage at zero and uses the latest stash data; it must not inherit old consumption or stale conversion factors for new usage.
- Materials changes can require an internet connection. They need not commit offline.
- The user will reconcile existing inventory/project data after implementation. Do not infer current balances, automatically link legacy yarns, or apply historical deductions during rollout.

## Implemented accounting design

Use stable stash IDs rather than matching names or colours. Each usage record contains its yarn reference, added skeins, label/conversion snapshot, and whether that amount actually deducted stock. A stable operation ID protects one submission against double taps and retries. The implemented schema is documented below for code review.

Keep project consumption and stock adjustments atomic: both succeed or neither does. Check stock again at commit time, reject stale conflicting corrections, and prevent a simultaneous project deletion/completion from racing a usage edit. Returning yarn must also be retry-safe. Direct stash edits must participate in the same concurrency policy rather than overwriting a newer balance.

Example: starting with 3 skeins, adding 0.25 leaves 2.75. Adding another 0.5 leaves 2.25 and shows 0.75 total used. Retrying that same second operation leaves 2.25, not 1.75. Correcting the second entry to 0.2 returns 0.3 and leaves 2.55. Completion leaves stock unchanged. Deleting that consuming project returns its remaining 0.45, leaving 3, absent other stock changes.

Confirmed: historical materials entered directly in Made remain stock-neutral, including corrections and deletion, because no stock was deducted. For example, recording 2 historical skeins, correcting them to 1.5, then deleting the project leaves stash unchanged throughout. WIP-origin consumption retains its stock effect after completion. Both kinds still link to stash and prevent deletion of a referenced yarn.

When offline, disable submission with a clear connection message while retaining the current in-memory input. Do not silently queue a deduction or show it as saved. Persistent draft storage and automatic submission are not currently proposed.

## Implemented conversion and history design

A stash item stores available skeins plus one conversion value and unit. Example: 1 skein = 100 g; 0.75 skeins used = 75 g. Alternatively, 1 skein = 240 m; 0.75 skeins used = 180 m. Never infer a weight-to-length conversion.

Snapshot yarn identity and conversion when logging usage so later stash edits do not change historical records. If a factor changes between entries, preserve each entry's factor and calculate from those snapshots. Made shows per-yarn skein totals and their recorded conversions. Do not combine unlike physical units into one total. Skein entries allow up to three decimal places; the conversion unit must be grams, metres, or yards. Implementation: represent skein balances and usage as integer thousandths to avoid floating-point drift, reject finer precision instead of silently rounding, and validate safe numeric bounds. Conversion factors are positive finite numbers up to 1,000,000,000; derived physical amounts display up to six decimal places without changing stored factors. Skein amounts are limited to 1,000,000 per balance or entry.

Material changes after completion use the same accounting distinction between stock-deducting and historical records. Reactivation leaves the Made original intact and starts the new WIP at zero; linked yarn details for new consumption come from current stash.

## Legacy compatibility

Existing records remain readable while awaiting the user's later reconciliation. Present quantities lacking confirmed skein conversion/linkage as needing setup; do not relabel grams as skeins. Require the necessary setup before new linked consumption can be committed. Existing Made records whose usage was deleted must show unavailable history rather than fabricated zero consumption.

Before any future reconciliation, show the old quantity, proposed skein quantity, selected stash link, conversion, and whether prior usage is already accounted for. User confirmation is necessary for that future data operation; it is not part of the current documentation changes.

## Verified v1 baseline and affected boundaries

- project-list.tsx currently displays cards and supports manual ordering of planned/active projects; v2 removes that interaction.
- project-yarns.tsx uses independent project yarn entries and +/- 1 quantity controls; replace with fractional incremental usage.
- inventory.ts currently rejects zero inventory; v2 permits zero and rejects negative stock.
- inventory-repository.ts and project-parts-repository.ts save independently; linked usage needs coordinated persistence.
- project-repository.ts completeProject deletes project yarn documents and working details; retain usage in v2 while preserving other agreed lifecycle behavior.
- project-photo-repository.ts sorts by upload timestamp and limits projects to five photos. First-photo selection needs stable tie-breaking. Manual Someday photos also require review of upload/delete permissions and cleanup.
- project.ts accepts schemaVersion 1 only. Reader compatibility, rules, installed PWA clients, and deployment order must be reviewed before changing stored formats.

Reuse React/TypeScript, Firestore, and Cloudinary. No additional library, external service, hosting change, or YouTube integration is approved. Final persistence details and security-rule enforcement will be reviewed before implementation; do not assume client-side checks alone enforce accounting.

## Decision record

The user confirmed one retained Someday reference image separate from Made photos, stock-neutral historical Made corrections/deletion, three-decimal skein quantities, grams/metres/yards only, and mandatory stash selection.

The final index decisions are:
- Someday and On The Hook: most recently updated first.
- Made: most recently completed first.
- Stash: include an opening index; ordering is not important to the user. Retain the existing order as an implementation choice.

No product questions remain from the requirements review. The user then requested implementation; the implemented technical choices below are available for code review.

## Acceptance criteria

- One animated journal page at a time, usable on iPhone 16 Pro; all four opening indexes support direct jumps and reorder controls are absent. Someday/On The Hook sort by most recent update, Made by most recent completion, and Stash retains its existing order.
- Long descriptions/notes resize and wrap without overflow; WIP summary shows progress text and its meaningful date.
- Someday permits one manual reference image, removes it before Start, and makes no thumbnail requests. Made uses the first remaining completed photo and respects its separate five-photo limit.
- Incremental fractional usage deducts once, rejects insufficient stock, and returns stock on approved corrections/deletion.
- Zero-stock pages persist and linked yarn deletion is blocked.
- Required conversion data is retained; Made history is stable after stash edits.
- Completion never double-charges; reactivation begins at zero with current stash information.
- Historical Made creation, corrections, and deletion leave stock unchanged; WIP-origin corrections/refunds remain stock-affecting after completion.
- Offline submissions are not reported as saved; unchanged v1 functions retain their existing connectivity behavior.
- Legacy reconciliation remains user-driven after implementation.



## Implemented data and code boundaries

No package dependencies were added. Existing React, Firestore, and Cloudinary facilities are reused.

| Record | Added fields / role |
| --- | --- |
| users/{uid}/inventory/{id} | milliSkeins integer balance; quantity remains a compatible skein display value; required conversion {value, unit}; linkedUsageCount; usageRevision; lastUsageId |
| users/{uid}/materialUsage/{id} | One added amount: projectId, inventoryId, name/material/colour snapshots, conversion snapshot, milliSkeins, deductsStock, version, operationId, createdAt, updatedAt |
| users/{uid}/projects/{id} | materialsMode consumed/historical; usageCount; usageRevision; lastUsageId; deleting lock; latestUpdateAt; photoRevision. Existing schemaVersion remains 1 with additive optional fields. |
| projects/{id}/referencePhotos/cover | At most one reference image, only while planned; removed before Start. |

Material transactions read the project, stash yarn, and usage entry before writing all three together. Rules use getAfter to validate the matched quantity delta, reference counts, and revisions. The normal stash-edit path may change its balance intentionally but cannot reset usage reference counts. Stale stash forms are rejected rather than overwriting later consumption. Conversion snapshots and stock-impact flags cannot be rewritten by a correction.

A new usage entry uses its submission UUID as its document ID. Retrying that submission does not deduct again. Corrections keep an expected entry version and operation ID; stale corrections fail with a reopen message. Removing an entry sets its quantity to zero, restores stock only if deductsStock is true, and drops its reference count. The zero entry temporarily remains as a retry marker. Project deletion locks new changes, refunds remaining entries transactionally, cleans media/working records/markers, then deletes the project. Interrupted deletion can be resumed from the journal or detail screen.

Changing a selected yarn after recording consumption is handled by removing the old entry and adding a new entry for the correct yarn; old conversion history is not silently relabelled. Direct Made records remain stock-neutral even when the recorded historical amount exceeds today's stock. Existing WIP consumption remains stock-affecting after completion.

Completion keeps usage entries and legacy yarn records while removing the working sections/counters. Reactivation creates a new project with zero usage; new entries select from current stash data. Existing v1 planned-material notes/editor remain separate from actual WIP consumption. Earlier WIP material notes are readable but do not silently become inventory deductions.

Uploads use a project photo revision to reject competing stale additions. The reference image uses a fixed document ID and a create-only rule. Finished-photo additions check the five-photo limit inside the coordinated repository workflow. First-photo selection orders by upload timestamp, then ID to break ties. The delete API explicitly selects either photos or referencePhotos from a boolean request field; callers cannot provide arbitrary collection paths.

Shared journal navigation lives in app/components/journal/journal.tsx. The index/page view mounts only the visible project's photos and materials. New materials UI is in materials-used.tsx; exact stock arithmetic is in lib/domain/materials.ts; transactions are in lib/firebase/materials-repository.ts. GrowingTextarea automatically fits long descriptions/notes and allows vertical resizing. Journal tests use isolated fixtures, not private accounts or production writes.

## Release and compatibility notes

- Review and deploy the new Firestore rules with this application release. New materials writes will not work against v1 rules.
- Deploy rules before enabling the new UI, then refresh installed PWAs. Older clients can still read legacy data, but their incompatible stock writes can be rejected once v2 stock invariants apply. Do not roll back to weaker v1 rules after recording linked usage.
- Existing stash records remain readable without conversion metadata. They need explicit user setup before new consumption can select them. Non-skein quantities are not reinterpreted as skeins.
- Existing data reconciliation remains a later user-driven activity. No production backup, migration, or deployment was run here.
- Browser verification uses desktop Edge/Chromium and an iPhone-sized 402 × 874 viewport. This is not a real-device Safari/PWA, camera, or Cloudinary integration sign-off.
- Local page screenshots use synthetic fixtures. Live photo upload/deletion still needs a release check with the configured development Cloudinary environment.

Transaction implementation was checked against [Firebase transactions](https://firebase.google.com/docs/firestore/manage-data/transactions) and [rules access to atomic writes](https://firebase.google.com/docs/firestore/security/rules-conditions).

## UI review captures

These are synthetic test fixtures, including deliberately long notes; the image blocks are test photos, not user content. Each journal page scrolls internally for longer content.

- [Someday on iPhone-sized viewport](screenshots/someday-iphone.png)
- [On The Hook on iPhone-sized viewport](screenshots/wip-iphone.png)
- [Made on iPhone-sized viewport](screenshots/made-iphone.png)
- [Stash on iPhone-sized viewport](screenshots/stash-iphone.png)

## On the Hook visual trial

Only active projects use WipJournal. It has pastel-green paper, nine animated spiral rings, no index ornament or little-book subtitle, and a New WIP link under Work Index. Index rows occupy 76px; a ResizeObserver measures available space to paginate the index without vertical scrolling. Long index titles show up to two lines; full names remain in the project. Pointer swipes (including drags beginning on index rows) and keyboard arrows navigate index and project pages. Previous/Next buttons are removed; the Index shortcut remains. Project detail summaries retain vertical scrolling for long notes. Other journals use the unchanged shared Journal component. Reduced motion disables both page and binding animation. No dependency or service was added.

### WIP motion revision

Removed the WIP page-turn and spiral-ring animations at the owner's request. Pages switch immediately when swiping or using keyboard navigation. Pastel paper, spiral binding, pagination and all other journal behavior remain. Other sections are unaffected.

## Shared approved book layout

Expanded the approved On the Hook layout to Someday, Made and Stash. All four now use components/journal/journal.tsx; the WIP-only component was consolidated. Each index paginates to available height, has its add action inside the book, and supports swipes and keyboard arrows without flip animations or bottom ornaments. Project books use pastel-green paper; stash yarn pages retain inventory colours. Long project details and editing forms retain their needed scrolling. Photo galleries opt out of page swipes and retain native horizontal scrolling. No data model, security rules, dependencies, billing or services changed.

## Reference image lifecycle revision — 2026-09-29 (deployed)

This supersedes the earlier reference-retention decisions. Reference images are Someday-only. Starting requires connectivity and removes the Cloudinary asset through the authenticated API, then its metadata, before changing status. Cleanup failure leaves the project planned for retry. Rules reject starting with a remaining reference and reject new references after Start, including concurrent uploads. A successfully removed reference stays removed if the subsequent status update fails; Start can be retried.

WIP and Made editors hide legacy reference images. No automatic migration or bulk deletion of previously retained references is performed; normal project deletion still cleans them up. Publish the matching rules and application together. No service or billing change is required.
