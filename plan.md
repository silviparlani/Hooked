# Hooked — Strategic Implementation Plan

Status: Milestone 4 complete; Milestone 5 in progress
Last updated: 2026-09-08

Latest verification: Milestone 4 passed 57 application tests, 10 Firestore security tests, strict type checking, linting, the production build, desktop browser inspection, and manual iPhone testing on 2026-09-08. Stash yarn supports optional custom names and recommended hook sizes, derived display names, decimal quantities, built-in and custom units, colour-derived pastel labels, and embedded edit/delete flows. The disabled Use action is intentionally deferred to a separate future checkpoint.

## 1. How to use this plan

This is a living execution and verification checklist. Complete milestones in order unless a documented dependency permits otherwise.

Checkbox meanings:

- `[ ]` not started
- `[~]` in progress
- `[x]` complete and verified
- `[!]` blocked, with the blocker recorded beside it

A milestone is complete only when its implementation, tests, acceptance criteria, and relevant documentation are complete. Any bug fix must add or strengthen a regression test whenever practical.

The architectural source of truth is `design.md`. If a task changes a confirmed product rule, update the design and decision log before treating the implementation as complete.

## 2. Definition of done

For every user-facing feature:

- [ ] Behavior matches `design.md`.
- [ ] Loading, empty, success, offline, and failure states are handled.
- [ ] Domain rules have unit tests.
- [ ] Firebase behavior has emulator-backed integration/rules tests.
- [ ] Critical user flows have component or end-to-end coverage.
- [ ] The feature is manually checked on an iPhone-sized Safari viewport.
- [ ] No authentication token, password, photo contents, or private free text appears in logs.
- [ ] Type checking, linting, tests, and production build pass.
- [ ] Relevant debugging notes and schema documentation are current.

## 3. Testing strategy

### 3.1 Test layers

1. **Unit tests** — pure validation, counter rules, lifecycle transforms, image constraints, and section-tree completion.
2. **Component tests** — forms, confirmations, status indicators, counter controls, image selection, and error states.
3. **Firebase emulator integration tests** — repositories, transactions, cascading cleanup, authentication boundaries, and Firestore rules.
4. **End-to-end tests** — principal workflows in a browser using isolated test accounts and emulator data where possible.
5. **Manual iPhone/PWA tests** — Safari installation, camera/library permissions, offline transitions, responsive layout, and browser-specific behavior.

### 3.2 Required environments

- Local unit/component environment with deterministic time and IDs where needed.
- Firebase Emulator Suite for Authentication and Firestore.
- A separate Cloudinary development product environment or tightly isolated test folder and upload preset for media integration tests.
- Deployed non-production environment with separate Firebase configuration.
- Production Firebase project on Spark with restrictive Firestore rules.
- iPhone 16 Pro or equivalent Safari viewport; real-device verification before declaring photo/PWA milestones complete.

### 3.3 Test-data principles

- Never use production credentials in automated tests.
- Give every test isolated user and document paths.
- Remove test Cloudinary assets after runs and fail visibly if cleanup cannot complete.
- Test both valid and deliberately malformed legacy documents.
- Freeze or inject time for timestamp-sensitive assertions.
- Use tiny generated image fixtures; do not commit personal photographs.

## 4. Milestone roadmap

```text
M0 Foundation
  ↓
M1 Firebase + authentication
  ↓
M2 Project lifecycle and home areas
  ↓
M3 Nested sections and counters
  ↓
M4 Inventory
  ↓
M5 Completion, album, and photos
  ↓
M6 Offline PWA and synchronization
  ↓
M7 Hardening, deployment, and handoff
  ↓
V2 Tags and book-like design
```

## 5. Milestone 0 — Foundation and tooling

### Deliverables

- [x] Initialize the `Hooked` Git repository and add a concise README.
- [x] Select and document the React/TypeScript build tool.
- [x] Enable strict TypeScript settings.
- [x] Select the PWA/service-worker integration approach.
- [x] Select unit, component, emulator-integration, and end-to-end test tools.
- [x] Establish the UI/application/domain/repository/Firebase folder boundaries.
- [x] Add formatting, linting, type-checking, test, browser-test, and production-build commands.
- [x] Add `.env.example` with non-secret configuration names.
- [x] Create separate development/emulator and production configuration paths.
- [x] Add continuous integration for type checking, linting, tests, browser tests, and build.
- [x] Record tool decisions in `design.md` ADRs.

### Acceptance criteria

- [x] A new contributor can install dependencies and launch the initial app from README instructions.
- [x] No private Firebase credentials or user data are committed.
- [x] A production build succeeds with the committed dependency lockfile.
- [x] The test runner executes domain, component, and browser tests; Firebase emulator coverage begins with Milestone 1.
- [x] The folder structure prevents pages from importing Firebase directly except through adapters/composition setup.

### Test scenarios

- [x] Install, type check, unit/component tests, browser tests, and production build succeed.
- [x] Firebase environment validation is assigned to Milestone 1, when Firebase becomes required.
- [x] Emulator-to-production protection is assigned to Milestone 1 and must precede Firebase integration tests.
- [x] Strict TypeScript checking runs locally and in CI.
- [x] CI runs checks without any publishing or deployment step.

## 6. Milestone 1 — Firebase and email/password authentication

### Deliverables

- [x] Use the isolated `demo-hooked` Emulator Suite project for automated development tests and `hooked-crochet-tracker` for production.
- [x] Enable email/password authentication.
- [x] Configure the production Firestore database.
- [x] Remove the now-obsolete Firebase Storage adapter, rules, emulator configuration, and tests.
- [x] Implement Firebase initialization behind an adapter.
- [x] Implement sign-up, sign-in, sign-out, authentication restoration, verification, and recovery behavior.
- [x] Require email verification and record optional persistent-login behavior.
- [x] Add default-deny Firestore rules; obsolete Firebase Storage rules have been removed.
- [x] Configure the Emulator Suite.
- [x] Add safe Firebase error-to-user-message mapping.

### Acceptance criteria

- [x] An authenticated user reaches the app; an unauthenticated user reaches authentication.
- [x] Refreshing the browser restores the expected authenticated session.
- [x] One user cannot read or mutate another user's Firestore paths.
- [x] Authentication errors are useful without revealing whether unrelated accounts exist beyond Firebase's intended behavior.
- [x] Production rules are versioned, tested, and deployed deliberately.

### Test scenarios

- [x] Create an account with valid credentials and complete email verification.
- [x] Reject malformed email, weak password, and mismatched password confirmation.
- [x] Sign in with correct credentials and reject incorrect credentials.
- [x] Restore persistent login after refresh and after opening a new browser tab; end session-only login when its tab closes.
- [x] Sign out and verify private screens/data are inaccessible.
- [x] Exercise recovery for an existing email account.
- [x] Attempt cross-user Firestore reads/writes and receive permission denial.
- [x] Simulate connectivity loss during sign-in and receive a retryable error. Full device-offline behavior remains assigned to Milestone 6.
- [x] Confirm application logging contains no password or ID token.

## 7. Milestone 2 — Home areas and project lifecycle

### Deliverables

- [x] Build the single home/bookshelf page with On the Hook, Made, Someday, and Stash entry points, navigation, and live project counts.
- [x] Implement project runtime validation and Firestore conversion.
- [x] Implement project repository queries by status.
- [x] Implement planned-project creation and editing.
- [x] Implement Inspiration list and detail states.
- [x] Implement “Start project” as a status change on the same document.
- [x] Implement active-project list and one WIP detail page per project.
- [x] Add editable description, multiple pattern sources, latest update, multiple hook sizes, and multiple independently counted yarn entries under Materials.
- [x] Make valid pattern URLs clickable and handle invalid/blank values safely.
- [x] Use creation time plus document ID as the legacy ordering fallback.
- [x] Allow touch/pointer and keyboard reordering of Someday and On the Hook project tiles, persisted with batched display positions.

### Acceptance criteria

- [x] The four areas are entries on one home screen, not persistent navigation tabs.
- [x] Planned and active lists show only their respective statuses.
- [x] Starting inspiration retains its name, description, URLs, hooks, and yarn details.
- [x] All optional active-project fields can be blank and later edited.
- [x] Each active project has a stable, directly addressable detail route.
- [x] Empty, loading, cached, pending, and failure states are distinguishable.
- [x] Reordered planned and active projects retain their position after reopening the list.

### Test scenarios

- [x] Create a planned project with only a name.
- [x] Create one with every optional field.
- [x] Reject a blank/whitespace-only name.
- [x] Save and reopen blank optional fields.
- [x] Display and open multiple valid HTTPS pattern URLs.
- [x] Reject malformed pattern source text without rendering a dangerous link.
- [x] Start a planned project and verify one document changes status rather than being copied.
- [x] Verify it disappears from Someday and appears under On the Hook.
- [x] Edit active-project fields independently through explicit edit/save gates where applicable.
- [x] Load zero, one, and many projects.
- [x] Verify stable ordering when timestamps are equal.
- [x] Reorder projects by dragging the whole card with a mouse or a touch hold, or with keyboard arrows; verify taps open projects, swipes scroll, and saved order survives reopening.
- [x] Attempt to read a malformed Firestore project and show a diagnosable safe error.

## 8. Milestone 3 — Sections, piece counters, and row counters

### Deliverables

- [x] Implement section and counter document converters and validation.
- [x] Support any number of root section documents.
- [x] Flatten legacy child sections into descriptively named counters under their root section.
- [x] Add multiple stitch-derived row counters per section without a separate name field.
- [x] Add an optional completed-piece target and counter to each section.
- [x] Implement increment, decrement, target editing, and open-ended targets.
- [x] Implement derived counter and section completion.
- [x] Surface malformed trees without crashing.
- [x] Implement confirmed recursive section deletion.
- [x] Use atomic counter changes that tolerate rapid taps.

### Acceptance criteria

- [x] Any number of root sections and counters render and update correctly.
- [x] The interface prevents creation of obsolete child sections.
- [x] Counters never become negative or increment past a target.
- [x] Open-ended counters display without an artificial denominator.
- [x] Section completion updates when one of its counters changes.
- [x] Completing every targeted row counter advances the optional section counter and resets the rows.
- [x] Row decrement at zero and section decrement at zero remain at zero without rolling backward.
- [x] There is no reorder or drag-and-drop control.
- [x] Section deletion removes precisely the selected section and its counters.

### Unit test scenarios

- [x] Build an empty tree.
- [x] Build projects with zero, one, and multiple root sections.
- [x] Handle multiple root sections and counters.
- [x] Migrate legacy nested sections into root counters without losing progress.
- [x] Reject creation of new child sections.
- [x] Increment `0/2` to `1/2`, then `2/2`.
- [x] Refuse increment at `2/2`.
- [x] Decrement `0` and remain at `0`.
- [x] Decrement a completed counter and reopen its ancestors.
- [x] Raise a completed counter's target and reopen its ancestors.
- [x] Reject negative, decimal, or non-numeric counter values.
- [x] Treat a null target as open-ended.
- [x] Mark a section with all targeted counters complete.
- [x] Keep an open-ended-only section incomplete until manually completed.
- [x] Keep an empty leaf section incomplete.
- [x] Combine all counters in a section correctly.

### Integration and UI scenarios

- [x] Rapidly tap increment and verify no updates are lost.
- [x] Update the same counter from two tabs and document last-write behavior.
- [x] Add multiple counters with the same stitch type to one section.
- [x] Delete a leaf section.
- [x] Delete a section containing multiple counters.
- [x] Cancel deletion and verify nothing changes.
- [x] Interrupt deletion and safely resume/retry it.
- [x] Deny writes to another user's project subtree.

## 9. Milestone 4 — Yarn inventory

### Deliverables

- [x] Implement inventory converter, validation, repository, list, create, edit, and deletion.
- [x] Support decimal quantities greater than zero.
- [x] Support skeins, grams, yards, metres, and custom units.
- [x] Require custom-unit text when the custom option is selected.
- [x] Keep different colours as independent records.
- [x] Confirm and remove records edited to zero.
- [x] Keep inventory independent from project yarn and amount-used fields.

### Acceptance criteria

- [x] Inventory can be managed without creating a project.
- [x] Project edits never silently change inventory.
- [x] Zero quantity cannot remain stored as an active inventory record.
- [x] Deleting inventory never alters existing project documents.

### Test scenarios

- [x] Create entries using every built-in unit.
- [x] Create an entry with a valid custom unit.
- [x] Reject custom unit with blank custom text.
- [x] Accept decimal values such as `0.5`.
- [x] Reject zero, negative, infinity, NaN, and non-numeric values.
- [x] Store otherwise identical yarn in two colours as separate records.
- [x] Edit a quantity to zero, cancel removal, and retain the prior record.
- [x] Edit to zero, confirm, and remove the record.
- [x] Delete inventory referenced descriptively by a project and verify the project is unchanged.
- [x] Attempt cross-user inventory access and receive permission denial.

## 10. Milestone 5 — Completion, finished album, and photos

### Deliverables

- [ ] Implement incomplete-section summary and destructive completion confirmation.
- [ ] Implement restart-safe, idempotent project completion cleanup.
- [ ] Retain only completion-approved project fields.
- [ ] Implement finished-album list and completed-project page.
- [ ] Keep completed description editable and pattern URL clickable.
- [ ] Implement reactivation as creation of a new active instance.
- [ ] Implement camera capture and photo-library selection in supported browsers.
- [ ] Implement orientation correction, resize, compression, metadata stripping where supported, and byte-size validation.
- [x] Create a Cloudinary Free product environment and a dedicated unsigned Hooked upload preset.
- [~] Restrict the preset to approved image formats, a 20 MB source limit, incoming resize/normalization, generated public IDs, and the Hooked asset folder. Formats and transformations are configured; enforce and verify the source-size limit programmatically.
- [~] Implement direct Cloudinary upload behind a media adapter; response validation and recent-upload cleanup are implemented, while Firestore photo persistence remains.
- [ ] Enforce five photos per completed project in application logic.
- [ ] Implement cover selection and cover removal behavior.
- [ ] Implement an authenticated server media endpoint for Cloudinary deletion; keep the API secret outside the PWA and validate Firebase identity and project ownership.
- [ ] Implement restart-safe photo/project deletion and Cloudinary orphan cleanup.
- [ ] Add a development-only display/log of processed dimensions and byte size.

### Acceptance criteria

- [ ] Completion is manual and possible with incomplete sections only after an explicit warning.
- [ ] Completing removes material requirements, latest update, hook, yarn, amount used, sections, and counters.
- [ ] Completing retains name, editable description, pattern URL, completion time, and future-compatible tag space.
- [ ] Reactivation leaves the completed project and its photos unchanged.
- [ ] The new active instance receives a new ID and copies only name, description, URL, and future tags.
- [ ] Only completed projects accept photographs.
- [ ] Uploaded files are independent of the original phone-library item.
- [ ] No processed upload exceeds 1 MB.
- [ ] A project cannot add a sixth photo through the normal UI.
- [ ] Deleting a photo or project removes its Cloudinary asset and Firestore metadata.
- [ ] No Cloudinary API secret is present in the browser bundle, repository, or logs.
- [ ] The documented privacy statement explains that possession of a v1 photo URL permits viewing the image.

### Completion test scenarios

- [ ] Complete a project whose sections are all complete.
- [ ] Complete one with incomplete targeted counters after confirming the warning.
- [ ] Cancel completion and verify every working field remains.
- [ ] Verify every retained and removed field exactly.
- [ ] Interrupt cleanup after the project status changes and resume safely.
- [ ] Interrupt cleanup between counter and section deletion and resume safely.
- [ ] Retry completion after some descendants are already missing.
- [ ] Confirm the project is never shown as an editable WIP while cleanup is pending.
- [ ] Reactivate and verify the original completed record is byte-for-byte unchanged except unrelated server metadata.
- [ ] Verify the new active record contains no photos, material requirements, counters, sections, hook, yarn, amount used, or latest update.

### Photo test scenarios

- [ ] Capture a photo with the camera on a real iPhone.
- [ ] Select an existing library photo.
- [ ] Remove the source from the library and verify the uploaded copy remains.
- [ ] Process portrait, landscape, rotated, high-resolution, and transparent-source images.
- [ ] Reject unsupported content and a file still larger than 1 MB after processing.
- [ ] Add five photos and reject the sixth.
- [ ] Simulate two tabs attempting the fifth/sixth upload and document the client-limit boundary.
- [ ] Select, replace, delete, and clear a cover photo.
- [ ] Delete the current cover when other photos remain.
- [ ] Lose connectivity before upload, during upload, and after upload but before metadata creation.
- [ ] Clean an orphaned Cloudinary asset when metadata creation fails.
- [ ] Retry deletion when the Cloudinary asset is already missing.
- [ ] Reject metadata creation under another user's project path.
- [ ] Reject unsupported formats and files over 1 MB through the Cloudinary preset even when client validation is bypassed.
- [ ] Confirm the browser bundle contains the cloud name and preset name but no API secret.
- [ ] Attempt to abuse the unsigned preset and verify its format, size, normalization, and folder restrictions.
- [ ] Verify the deletion endpoint rejects a missing, invalid, expired, or wrong-user Firebase token.
- [ ] Verify a public delivery URL works without Firebase authentication, matching the accepted privacy decision.
- [ ] Verify deleting a completed project removes all five possible photos.

## 11. Milestone 6 — Offline PWA and synchronization

### Deliverables

- [ ] Add a valid web app manifest, icons, theme metadata, and standalone display configuration.
- [ ] Cache the application shell without broadly caching private Firebase responses.
- [ ] Enable Firestore persistent browser cache on supported trusted devices.
- [ ] Implement online, offline, synchronizing, and waiting-to-sync indicators.
- [ ] Show whether relevant data came from cache or has pending writes where useful.
- [ ] Queue supported text and counter changes offline.
- [ ] Require connectivity for photo mutations.
- [ ] Add safe update-ready behavior for new service-worker versions.
- [ ] Add iPhone “Add to Home Screen” guidance.
- [ ] Add warnings around sign-out when writes are pending where detection is reliable.

### Acceptance criteria

- [ ] After one successful load, the app shell and previously loaded textual data reopen offline.
- [ ] Offline text/counter edits visibly remain pending and synchronize on reconnection.
- [ ] Photo controls explain that connectivity is required rather than failing silently.
- [ ] The app never labels an unconfirmed remote write as fully synchronized.
- [ ] A service-worker update does not discard unsaved form input.
- [ ] Installing from Safari produces a usable standalone Home Screen app.

### Offline and synchronization scenarios

- [ ] First-ever launch while offline produces a clear connection requirement.
- [ ] Launch previously used PWA while offline and read cached projects.
- [ ] Edit latest update offline, reconnect, and verify synchronization.
- [ ] Increment counters repeatedly offline, reconnect, and verify valid final values.
- [ ] Reach a counter target offline and verify derived section completion.
- [ ] Attempt photo upload/delete offline and receive a connectivity message.
- [ ] Begin an edit online and lose connectivity before acknowledgement.
- [ ] Sign out with and without pending writes.
- [ ] Edit the same field on two devices and verify/document last-write-wins.
- [ ] Receive a security-rule rejection after an optimistic local write and recover the UI.
- [ ] Clear Safari website data and confirm cached data disappears but cloud data returns after sign-in.
- [ ] Load a previously unseen photo offline and show a safe placeholder.
- [ ] Upgrade the service worker while a form contains unsaved text.
- [ ] Verify private Firebase responses and Cloudinary photos are not placed in an overly broad service-worker cache.

## 12. Milestone 7 — Hardening, deployment, and handoff

### Deliverables

- [ ] Resolve every open implementation question in `design.md`.
- [ ] Review Firestore rules against actual document shapes and review the deployed Cloudinary upload-preset restrictions.
- [ ] Enable and test App Check if compatible with the selected PWA workflow.
- [ ] Configure production hosting and HTTPS.
- [ ] Document the manual Cloudinary credit-usage and unexpected-upload review procedure.
- [ ] Add pagination or bounded queries where collection growth warrants it.
- [ ] Run dependency, build, and security checks.
- [ ] Verify responsive layout on iPhone 16 Pro and a desktop browser.
- [ ] Create a production deployment and rollback checklist.
- [ ] Complete README setup, architecture overview, testing guide, and troubleshooting links.
- [ ] Perform a clean-account acceptance run.
- [ ] Tag the v1 release in Git.

### Acceptance criteria

- [ ] All automated suites pass against their intended environments.
- [ ] Production deploy is repeatable from documented steps.
- [ ] Production rules deny unauthenticated and cross-user access.
- [ ] The deployed PWA installs and launches on the target iPhone.
- [ ] Firebase usage and Cloudinary credit-usage locations are documented.
- [ ] No known P0/P1 defects remain; accepted lower-priority defects are recorded.

### Full-system test scenarios

- [ ] New user: register → create inspiration → start it → add sections and named counters → complete it → add five photos → select cover → reactivate it.
- [ ] Returning user signs in on a second browser and sees synchronized cloud data.
- [ ] User operates cached WIP data through an offline/reconnect cycle.
- [ ] User permanently deletes an active project and verifies no sections or counters remain.
- [ ] User permanently deletes a five-photo completed project and verifies no Cloudinary assets remain.
- [ ] Malformed documents fail safely with diagnostic information and no destructive automatic rewrite.
- [ ] Interrupted completion and deletion operations recover after reload.
- [ ] Usage remains bounded during repeated navigation; listeners detach when no longer needed.
- [ ] Production build contains no emulator endpoint or test account.

## 13. V2 backlog — Tags and book-like experience

V2 begins only after v1 data integrity and lifecycle behavior are stable.

- [ ] Design reusable tags such as `amigurumi`, `clothing`, `accessories`, and `gifts`.
- [ ] Allow multiple tags per project.
- [ ] Filter or group each notebook without merging distinct project records.
- [ ] Ensure tag deletion has defined project behavior.
- [ ] Add tag security rules, migrations, indexes, and tests.
- [ ] Develop the bookshelf, notebook, album, and inventory visual system.
- [ ] Prototype page-turn/swipe navigation without harming direct routing or usability.
- [ ] Add motion-reduction behavior before page animations ship.
- [ ] Conduct a dedicated accessibility pass: contrast, large text, screen-reader labels, focus order, touch targets, and one-handed counter operation.

### V2 tag test scenarios

- [ ] Assign zero, one, and multiple tags to a project.
- [ ] Group many projects under `amigurumi` without changing their photo counts or IDs.
- [ ] Rename a tag and update every view consistently.
- [ ] Delete a tag without deleting projects.
- [ ] Use tags across planned, active, and completed projects.
- [ ] Reactivate a completed project and copy its tags to the new active instance.

## 14. Regression test register

Add one row for every confirmed defect. Link the test that prevents recurrence.

| Bug ID | Symptom | Root cause | Regression test | Fixed in |
|---|---|---|---|---|
| — | No bugs recorded yet | — | — | — |

## 15. Decision and progress log

Record material changes in chronological order. Product or architecture changes must also update `design.md`.

| Date | Change | Reason | Affected milestones |
|---|---|---|---|
| 2026-09-06 | Initial plan created | Product and architecture decisions completed | All |
| 2026-09-06 | Replaced Firebase Storage with Cloudinary Free for photos | Avoids Blaze billing while preserving cloud-first, phone-independent photos; public delivery URLs are accepted | M1, M5–M7 |

## 16. Release checklist

- [ ] Version and changelog updated.
- [ ] `design.md` and `plan.md` match implemented behavior.
- [ ] Type checking, linting, unit, component, emulator integration, rules, and end-to-end tests pass.
- [ ] Real-iPhone camera, library, PWA install, and offline checks pass.
- [ ] Firestore indexes and rules are deployed from source control.
- [ ] Firestore rules enforce authentication and ownership; Cloudinary upload presets enforce media restrictions.
- [ ] Cloudinary credit monitoring and unexpected-upload review are documented.
- [ ] Production environment contains no test data or accounts created by automation.
- [ ] Deployment rollback procedure is ready.
- [ ] Known limitations are documented.

