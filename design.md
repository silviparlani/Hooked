# Hooked — Product and Architecture Design

Status: Initial design baseline  
Last updated: 2026-09-07

## 1. Purpose

Hooked is a private, cloud-first progressive web app for tracking crochet projects and yarn inventory. It is designed primarily for one person on an iPhone, while remaining accessible through a browser on another device after authentication.

This document is the durable reference for product behavior, data ownership, architecture, and debugging. When implementation and this document disagree, determine whether the implementation is defective or this decision record needs an explicit revision. Do not silently allow them to drift.

## 2. Product vision

The interface is imagined as a bookshelf containing three books and a separate inventory area:

1. **Progress notebook** — active works in progress (WIPs). Each WIP is presented as its own notebook page.
2. **Finished album** — completed work, emphasizing photographs and an editable description.
3. **Inspiration notebook** — planned projects with pattern links and material notes.
4. **Yarn inventory** — a practical record of yarn on hand.

These are four entry points on one home screen, not four persistent navigation tabs. Page-turn gestures and detailed book-like visual treatment are intentionally deferred until the functional foundation is stable.

## 3. Goals and non-goals

### Goals

- Track planned, active, and completed crochet projects.
- Represent any number of root project sections with any number of named counters.
- Support multiple named row counters within a section.
- Keep project data and completed-project photographs in the cloud.
- Remain useful during temporary loss of connectivity.
- Be installable to the iPhone Home Screen as a PWA.
- Keep normal personal usage within Firebase's no-cost allowances through controlled image processing.
- Teach the implemented concepts through clear boundaries, names, tests, and documentation.
- Make failures diagnosable without requiring knowledge of the entire codebase.

### Non-goals for v1

- App Store publication or a native iOS binary.
- Sign in with Apple.
- Multiple users collaborating on one collection.
- Social or public sharing.
- Automatic inventory deduction from project usage.
- Reordering sections, counters, yarn entries, or completed projects.
- Reusable project templates.
- Progress-entry history.
- Trash, undo, or recovery after confirmed deletion.
- Photographs on planned projects, active projects, or inventory.
- Full offline availability of every photograph.
- Sophisticated cross-device conflict resolution.
- Tags/categories; these are planned for v2.
- Final book styling, animation, or page-turn gestures.
- Accessibility-specific enhancements beyond sound semantic HTML and basic keyboard/focus behavior; a focused accessibility pass is deferred.

## 4. Confirmed product rules

### 4.1 Project lifecycle

A project has exactly one status:

- `planned` — appears in Inspiration.
- `active` — appears in In Progress.
- `completed` — appears in the Finished Album.

Starting a planned project changes the same document from `planned` to `active`. Its name, description, pattern URL, and material requirements are retained where applicable.

Finishing an active project is always a manual action. It remains available even when sections are incomplete, but requires a warning that unfinished work and working details will be removed.

Completion retains:

- project name;
- editable project description;
- pattern URL;
- completion timestamp;
- completed-project photos and selected cover photo;
- future tags when v2 adds them.

Completion permanently removes:

- planned material requirements;
- latest progress update;
- hook size;
- project yarn details and amount used;
- sections and their counters;
- row counters.

Reactivation does not change the completed record. It creates a new `active` project with a new ID and copies the completed project's name, editable description, pattern URL, and future tags. It copies neither photographs nor deleted working details. The new record stores the completed record's ID as its source for traceability.

### 4.2 Planned projects

A planned project may contain:

- name;
- description;
- pattern URL;
- one free-text `materialsRequired` field.

Except for the name, these fields may be blank. Starting the project retains them, while active-specific fields can then be added.

### 4.3 Active projects

An active project may contain:

- name;
- editable description;
- pattern URL;
- latest progress update (one replaceable field, not a journal);
- hook size;
- structured yarn material, category, colour, quantity, and quantity unit;
- optional, manually edited yarn amount used;
- root sections with optional piece targets and stitch-derived row counters.

All fields except the name and status may be blank. Inventory is not automatically changed by a project's yarn fields or amount used.

### 4.4 Sections and counters

A section is a top-level project container with any number of row counters. It may optionally count repeated pieces, such as 51 granny squares. Each row counter records its stitch type (`sc`, `dc`, `hdc`, `tc`, `sk`, `sl st`, or custom), an optional stitches-per-row value, and its row progress and optional row target. Its display name is derived from the stitch type; custom stitches record their own display name and production instructions. Older nested data is flattened into its root section on load before the obsolete child documents are removed.

Counters:

- derive their display name from the selected stitch;
- increment and decrement by one;
- never fall below zero;
- may have a non-negative integer target or be open-ended (`target: null`);
- stop incrementing when the target is reached;
- allow direct editing of the target;

When a section has a piece target, completing every targeted row counter increments the section's completed-piece count and resets those row counters to zero for the next piece. Open-ended row counters prevent this automatic rollover because they have no completion point. Section controls can increment or decrement the completed-piece count directly, never outside zero and the target. Decrementing row progress at zero never rolls the section back to the previous piece.

Completion is derived rather than independently stored:

1. A targeted counter is complete when `current === target`.
2. Open-ended counters do not contribute to automatic completion.
3. A section with a piece target is complete when its completed-piece count reaches that target.
4. A section without a piece target is complete when all its counters are complete.
5. A section with only open-ended counters is not automatically complete.
6. A section with no counters is not automatically complete.
7. Project completion remains manual regardless of section state.

Computing section completion from counters prevents a stored `isComplete` flag from becoming inconsistent with its source data.

### 4.5 Completed projects and photos

Completed projects have an editable description and up to five photographs. Photos may come from the camera or photo library. Hooked copies and uploads its own processed image; it does not depend on the original remaining in the phone's library.

One photo may be selected as the cover. Removing the cover requires either selecting another existing photo or leaving the project without a cover.

Each image is processed before upload:

- correct orientation;
- resize the longest edge to approximately 1600–2000 pixels;
- compress toward approximately 500–750 KB;
- enforce a hard maximum of 1 MB after processing;
- accept only explicitly allowed image MIME types;
- strip unnecessary metadata where supported.

Only one optimized cloud copy is authoritative. Small display thumbnails should be generated/cached on the device rather than permanently duplicating every cloud image.

### 4.6 Inventory

An inventory record contains:

- optional custom name, otherwise displayed as colour + material + category;
- material;
- category;
- colour;
- optional recommended hook size;
- decimal quantity greater than zero;
- unit: `skeins`, `grams`, `yards`, `metres`, or a custom unit.

Otherwise identical yarn in different colours remains separate inventory records. Editing a quantity to zero removes the record after confirmation. Inventory changes do not affect projects in v1.

Inventory labels use a pastel derived from the colour text with the established green as a safe fallback. Edit and deletion are implemented; assigning stash yarn to a project through the visible Use action is deferred to a separate future checkpoint.

### 4.7 Deletion

Deletion is permanent and always requires a confirmation that names the scope.

- Deleting a project deletes its sections and counters.
- Deleting a completed project also deletes all of its Cloudinary assets.
- Deleting a section deletes all of its counters.
- Deleting an inventory record affects no projects.
- There is no trash or recovery feature.

Cloud deletion must be restart-safe and idempotent: retrying an interrupted cleanup must finish the same operation without damaging unrelated data.

## 5. System context

```text
┌─────────────────────────────────────────────┐
│ Installed PWA in Safari / another browser  │
│ React UI + domain logic + offline status   │
└───────────────┬─────────────────────────────┘
                │ HTTPS
        ┌───────┴────────┬──────────────────┐
        │                │                  │
┌───────▼───────┐ ┌──────▼──────┐ ┌────────▼────────┐
│ Firebase Auth │ │ Cloud       │ │ Cloudinary      │
│ email/password│ │ Firestore   │ │ optimized photos│
└───────────────┘ └─────────────┘ └─────────────────┘
```

The PWA is the client. Firebase Authentication establishes identity. Firestore stores structured application data and photo references. Cloudinary stores and delivers the optimized image bytes. A Firestore photo document stores both the Cloudinary public ID used to manage the asset and its HTTPS delivery URL.

## 6. Technology decisions

### 6.1 Locked choices

- Progressive web app, not a native React Native application.
- React and TypeScript with strict type checking.
- Firebase Authentication using email and password.
- Cloud Firestore as the authoritative document database.
- Cloudinary Free for optimized completed-project photos.
- Firebase web SDK.
- Firestore-generated string document IDs.
- Built-in React state for temporary UI state.
- Firebase-backed hooks/services for persistent data.
- Firestore security rules and constrained Cloudinary upload settings documented with the repository.
- Git and GitHub for source control.

### 6.2 Implementation choices

- Vinext with Vite is the initial React application and build toolchain.
- Tailwind CSS and the generated shadcn component set provide interface foundations; Hooked-specific styling must use its own theme rather than the starter defaults.
- The PWA manifest is generated through the application metadata route.
- The service worker will use `vite-plugin-pwa` in `injectManifest` mode during Milestone 6. This keeps private Firebase responses and Cloudinary photographs out of broad automatic runtime caching while still letting the build manage app-shell assets.
- Vitest runs pure domain and component tests. React Testing Library checks rendered behavior through accessible names. Playwright checks complete browser flows at desktop and iPhone-sized viewports. Firebase Emulator Suite tests will be added beside the Firebase adapters in Milestone 1.

### 6.3 Why Firebase

Firebase was selected for authentication and the document database because it makes the same collection available on multiple devices, provides a useful document-database learning opportunity, and should remain within Spark allowances for the intended personal scale.

Firebase Cloud Storage was replaced by Cloudinary because new Storage use requires Blaze billing activation. Cloudinary's Free plan requires no billing account and pools its allowance across managed storage, bandwidth, and transformations. The trade-off is that v1 image delivery URLs are public: Firebase Authentication protects the Firestore references and the Hooked interface, but anyone who obtains a Cloudinary URL can view that photograph. This is accepted because the images contain crochet projects rather than sensitive material.

The application must never contain a Cloudinary API secret. Browser uploads use a narrowly constrained unsigned upload preset. Later deletion uses an authenticated server endpoint that validates the Firebase user and keeps the Cloudinary secret server-side.

### 6.4 Why not local SQLite

SQLite can model arbitrary nesting and remains a valid alternative. It was rejected for v1 because automatic multi-device recovery and cloud-held photos were prioritized over avoiding backend infrastructure. SQLite may later be introduced only if requirements grow beyond Firestore's browser persistence; it must not be added merely as a second source of truth.

### 6.5 Why not Supabase

Supabase provides a coherent free relational backend, authentication, and storage. It was rejected because the selected direction prioritizes learning a document database and Firebase's client synchronization model. This decision should be revisited if billing exposure becomes unacceptable.

## 7. Architecture boundaries

Keep the following layers distinct:

```text
UI components and pages
        ↓
Application use cases
        ↓
Domain rules and validation
        ↓
Repository interfaces
        ↓
Firebase and Cloudinary adapters
```

### UI components and pages

Render state, collect input, and announce loading/error/synchronization status. They do not construct Firestore paths or call Cloudinary management APIs directly.

### Application use cases

Coordinate actions such as starting inspiration, completing a project, reactivating a completed project, uploading a photo, and cascading deletion.

### Domain rules

Pure TypeScript functions enforce counter bounds, compute section completion, validate units and URLs, build trees, and decide which fields survive lifecycle transitions. These functions should be thoroughly unit tested without Firebase.

### Repository interfaces

Describe the operations the application needs without exposing Firebase snapshots throughout the UI. Examples include `listProjectsByStatus`, `saveCounter`, `completeProject`, and `deleteSectionTree`.

### Service adapters

Firebase adapters own SDK calls, document conversion, timestamps, batches/transactions, subscriptions, authentication persistence, and Firebase error translation. A separate Cloudinary adapter owns upload requests and delivery metadata. A server-side media endpoint owns authenticated deletion so the Cloudinary API secret never reaches the browser.

This separation is primarily a debugging tool: it tells us whether a defect belongs to presentation, a business rule, orchestration, or remote persistence.

## 8. Firestore data model

All private data lives below the authenticated user's path. This makes ownership visible in both queries and security rules.

```text
users/{uid}
├── projects/{projectId}
│   ├── sections/{sectionId}
│   │   └── counters/{counterId}
│   └── photos/{photoId}
└── inventory/{inventoryId}
```

The intermediate `users/{uid}` document is not required. Firestore permits project and inventory documents in its subcollections even when no document exists at `users/{uid}`. Firebase Authentication owns the account, password, UID, and account-creation metadata. Add a user document later only when Hooked has genuine user-level settings or profile data to store.

Tags/categories will be introduced in v2 without changing the core project lifecycle.

### 8.1 Project document

```ts
type ProjectStatus = 'planned' | 'active' | 'completed';

type Quantity = {
  value: number;
  unit: 'skeins' | 'grams' | 'yards' | 'metres' | 'custom';
  customUnit?: string;
};

type ProjectDocument = {
  name: string;
  status: ProjectStatus;
  description?: string;
  patternUrl?: string;

  // Planned-project data
  materialsRequired?: string;

  // Active-project data; removed on completion
  latestUpdate?: string;
  hookSize?: string;

  // Completed-project data
  coverPhotoId?: string;
  completedAt?: Timestamp;

  // Set only when a completed project creates a new active instance
  sourceCompletedProjectId?: string;

  // User-selected order within the planned or active list
  displayOrder?: number;

  createdAt: Timestamp;
  updatedAt: Timestamp;
  schemaVersion: number;
};
```

Missing optional fields, rather than empty placeholder objects, keep documents readable. Runtime converters must validate data read from Firestore instead of trusting a TypeScript type assertion.

Planned and active project tiles can be reordered by dragging anywhere on the card. Touch users hold briefly before dragging; a quick swipe scrolls and a tap opens the project. No separate drag handle is shown. The app writes a non-negative `displayOrder` for every project in the visible status list in one batch. Older documents without the field retain creation-time ordering until their list is first reordered. Focused project links also support Up and Down arrow keys.

### 8.2 Section document

```ts
type SectionDocument = {
  name: string;
  parentSectionId: string | null;
  current: number;
  target: number | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};
```

New sections are root-level only. `parentSectionId` remains solely for reading and flattening legacy nested data. `current` and `target` form the optional completed-piece counter.

A section belongs to its project through its Firestore path: `users/{uid}/projects/{projectId}/sections/{sectionId}`. The `projectId` therefore does not need to be repeated inside the section document. Reading the project's `sections` subcollection returns only sections belonging to that project. `parentSectionId` has a different purpose: it connects one section to another section inside that same project to create nesting.

The application must reject self-parenting, missing parents, parents from another project, and cycles. As reordering is excluded, stable display order is creation order with document ID as a deterministic tie-breaker.

### 8.3 Counter document

```ts
type CounterDocument = {
  name: string; // legacy/derived compatibility value; not entered separately
  stitchType: "sc" | "dc" | "hdc" | "tc" | "sk" | "sl_st" | "custom";
  customStitchName?: string;
  customStitchInstructions?: string;
  stitchesPerRow: number | null;
  current: number;
  target: number | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};
```

Both values are non-negative integers. A targeted counter is complete only when current equals target. Incrementing uses an atomic operation or transaction so rapid taps do not overwrite one another.

### 8.4 Project yarn document

```ts
type ProjectYarnDocument = {
  name: string;
  material: string;
  category: string;
  colour: string;
  quantity: number;
  unit: 'skeins' | 'grams' | 'yards' | 'metres' | 'custom';
  customUnit?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};
```

An active or planned project may use any number of yarn entries stored at `users/{uid}/projects/{projectId}/yarns/{yarnId}`. Each entry starts with an editable default name such as “Yarn 1.” `quantity` represents the amount used so far. It starts at zero and changes through atomic increment/decrement operations, never below zero. Custom units stored on yarn entries are offered as reusable options while they remain in that project's yarn collection. A project may select multiple hook sizes from 1 mm through 7 mm in 0.5 mm intervals; the current schema stores the selections as one comma-separated `hookSize` string for backward compatibility. Materials are read-only by default and enter a visually distinct edit/save state on request. Yarn display cards use a compact yarn-label visual treatment. This replaces the earlier single embedded yarn object and separate `amountUsed` field so every yarn can be described and counted independently.

A project may store multiple pattern sources in the existing `patternUrl` text field, separated by line breaks. Display mode parses only complete HTTP or HTTPS sources and renders them as numbered links without exposing the raw URL text. Editing uses one URL field per source behind an explicit edit/save gate.

### 8.5 Photo document and Cloudinary asset

```ts
type PhotoDocument = {
  cloudinaryPublicId: string;
  secureUrl: string;
  assetVersion: number;
  format: string;
  contentType: string;
  byteSize: number;
  width: number;
  height: number;
  createdAt: Timestamp;
};
```

Cloudinary organization:

```text
Media Library asset folder: hooked
Public ID: Cloudinary-generated unguessable value
```

The project must be completed before the app permits an upload. Before upload, the client validates ownership through Firestore, checks the source image, and applies the five-photo rule. The unsigned Cloudinary upload preset independently restricts accepted image formats, generated identifiers, asset-folder placement, and incoming resizing, conversion, compression, and metadata removal. Its preset name is public configuration, not a password, so it must be safe even when inspected in browser code. The configured incoming transformation is `c_limit,w_2000,h_2000/q_auto:eco,f_jpg,fl_force_strip`.

`cloudinaryPublicId` is the management identity used for deletion and future transformations. It does not include the Media Library asset folder when Cloudinary's dynamic-folder mode is active. `secureUrl` is the HTTPS address rendered by the app. Keeping only the URL would make later deletion and migration unnecessarily fragile. The five-photo limit is an application invariant rather than an unbreakable Cloudinary account-wide constraint; a public unsigned preset can theoretically be used outside Hooked if its name is discovered.

### 8.6 Inventory document

```ts
type InventoryDocument = {
  material: string;
  category: string;
  colour: string;
  quantity: number;
  unit: 'skeins' | 'grams' | 'yards' | 'metres' | 'custom';
  customUnit?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};
```

Quantity is finite and greater than zero. A custom unit requires non-blank `customUnit` text.

## 9. Document-database concepts used

### Collections and documents

A collection groups documents of the same role. Each project is one document rather than one SQL row. Related sections and photos live in subcollections beneath that project.

### References by ID

`parentSectionId` and `sourceCompletedProjectId` are identifiers, not embedded copies of an entire document. The application resolves them when building a tree or displaying lineage.

### Denormalization

Firestore sometimes duplicates small values to make reads simple. Any duplicated field must have one declared source of truth and a tested update rule. Avoid speculative duplication in v1.

### Atomic operations

Counter increments and lifecycle changes that touch several documents must avoid lost updates and half-finished state. Use transactions for read-then-write invariants and batches for known groups of writes. Large recursive cleanup may require multiple batches and therefore an idempotent operation state.

### No automatic subcollection deletion

Deleting a Firestore project document does not automatically delete its section, counter, or photo subcollections. Every destructive workflow must enumerate and delete descendants deliberately. This is a central debugging and test requirement.

## 10. Lifecycle workflows

### 10.1 Start an inspiration

1. Validate the planned project.
2. Update its status to `active`.
3. Retain name, description, pattern URL, and materials-required text.
4. Initialize active-only fields only when the user supplies them.
5. Navigate to its WIP page after the confirmed server/local-cache write.

### 10.2 Complete a project

Completion is destructive and must tolerate interruption:

1. Show a confirmation summarizing incomplete sections and fields to be removed.
2. Mark the project with an internal completion-operation state so the operation can resume.
3. Set status and completion timestamp while retaining name, description, and pattern URL.
4. Delete counters and sections in bounded batches.
5. Remove active-only fields.
6. Clear the operation marker only after cleanup succeeds.
7. If interrupted, resume cleanup the next time the project is loaded rather than presenting inconsistent editable WIP data.

Photographs are added only after the project is completed.

### 10.3 Reactivate a completed project

1. Leave the completed document and all photos unchanged.
2. Create a new project ID.
3. Copy name, description, pattern URL, and future tags.
4. Set status to `active` and `sourceCompletedProjectId` to the completed document's ID.
5. Do not copy photos, sections, counters, or previous working details.

### 10.4 Delete a completed project

1. Confirm the exact project and number of photos.
2. Mark an idempotent deletion operation.
3. Call the authenticated media endpoint to delete every Cloudinary public ID referenced by its photo documents.
4. Delete photo documents and any unexpected remaining working subcollections.
5. Delete the project document last.
6. Treat “already missing” resources as successful cleanup during retries.

## 11. Offline and synchronization policy

Enable Firestore's persistent browser cache on supported trusted devices.

- Previously loaded project and inventory data remains readable offline.
- Text edits and counter changes can be queued offline.
- Pending writes are visibly labelled “Waiting to sync.”
- The global interface reports online, offline, and synchronizing states.
- Signing out or clearing local browser data with pending writes triggers a warning where the platform permits detection.
- Photo upload, replacement, and cloud deletion require connectivity.
- Previously viewed photos may remain in browser cache, but complete offline photo availability is not guaranteed.
- Pattern URLs require connectivity.
- Concurrent edits to the same field use last-write-wins in v1.
- A failed server validation must replace optimistic success with an actionable error and restore/reload authoritative data.

The Firestore cache is not a separate database and must not be treated as a backup. Firebase remains authoritative.

## 12. PWA behavior

The app shell should be cached so Hooked can launch without a network connection. The service worker must not broadly cache authenticated Firebase responses or Cloudinary photographs; previously viewed photos may still exist in the browser's ordinary HTTP cache.

Required PWA elements:

- web app manifest with Hooked name, theme colours, icons, and standalone display;
- secure HTTPS deployment;
- install guidance appropriate to iPhone Safari;
- update notification when a new application shell is ready;
- safe service-worker update behavior that does not discard pending form work;
- responsive layouts for the iPhone 16 Pro and ordinary desktop browsers.

## 13. Security and privacy

### Authentication

- Use Firebase email/password authentication in v1.
- Require email verification before private project data is accessible.
- Offer a “Keep me logged in” option. When selected, Firebase authentication persists across browser and installed-PWA restarts. When not selected, authentication uses session persistence and ends when that browser session ends.
- Provide Firebase's email-based password-reset flow.
- Never log passwords, ID tokens, image bytes, or complete private project descriptions.

### Firestore rules

- Deny access by default.
- Permit reads and writes only when `request.auth.uid` matches the `{uid}` path.
- Validate allowed fields, types, statuses, numeric bounds, and immutable ownership.
- Prevent clients from writing server-controlled timestamps or operation markers except through approved shapes.
- Test rules using the Firebase emulator before deployment.

### Cloudinary uploads and delivery

- Use an unsigned upload preset because the PWA uploads directly from the browser.
- Restrict that preset to approved image formats, a 1 MB maximum, incoming resize/normalization, generated public IDs, and the Hooked folder convention.
- Keep the Cloudinary cloud name and upload-preset name in public environment configuration; never expose the API secret.
- Accept that delivered v1 photographs have public HTTPS URLs. Firebase Authentication protects their Firestore references, not the asset URL after it is known.
- Perform destructive Cloudinary operations only through a server endpoint that validates the Firebase identity and project ownership.

### Web configuration

Firebase web configuration values, the Cloudinary cloud name, and an unsigned preset name are public identifiers rather than server secrets. Security comes from Authentication, Firestore rules, HTTPS, constrained upload settings, server-side ownership checks for destructive media operations, and optional App Check—not from trying to hide browser configuration. The Cloudinary API secret is different: it must exist only in protected server configuration.

## 14. Reliability, observability, and cost controls

### Reliability

- Every loading state has an error and retry state.
- Multi-step destructive operations are idempotent.
- Uploads use unique paths and create metadata only after the object upload succeeds.
- If metadata creation fails, the orphaned object is removed or recorded for later cleanup.
- If file deletion succeeds but metadata deletion fails, retry treats the missing file as success.
- User-visible timestamps use local time, while stored timestamps use Firebase server timestamps where ordering matters.

### Diagnostics

Development logging may include:

- operation name;
- user-safe project/document IDs;
- online/cache/server source;
- pending-write state;
- Firebase error code;
- cleanup stage;
- schema version.

Logs must exclude authentication tokens, passwords, photo contents, and sensitive free text.

### Cost controls

- Five photos maximum per completed project.
- One megabyte hard maximum per uploaded image.
- Resize/compress before upload and display the resulting size during development.
- Avoid unnecessary real-time listeners and detach them when screens unmount.
- Query by status rather than repeatedly downloading every project.
- Paginate the completed album when its size warrants it.
- Monitor Cloudinary's pooled monthly credits for storage, bandwidth, and transformations.
- Document how to inspect Firestore reads and Cloudinary storage, bandwidth, transformations, and unexpected uploads.

## 15. Debugging reference

### “My edit disappeared”

Check, in order:

1. Was the user authenticated as the expected UID?
2. Was the screen showing a pending local write, cached data, or server-confirmed data?
3. Did a later write from another tab/device win?
4. Did validation or a security rule reject the write?
5. Did a stale subscription overwrite temporary form state?
6. Does the stored document match the runtime schema version?

### “A counter skipped or lost a tap”

Check whether increment used an atomic update/transaction, whether the UI allowed taps after the target, and whether multiple controls were editing the same document. Reproduce with rapid taps and two browser tabs.

### “A section completion badge is wrong”

Inspect the loaded section graph for missing parents, cycles, unloaded descendants, open-ended-only sections, and counters whose current value or target is invalid. Recompute completion with the pure domain function and compare its input with Firestore documents.

### “A deleted project still consumes photo storage”

Inspect the deletion-operation stage, photo metadata, Cloudinary public IDs, media-endpoint response, and authorization failures. Retry cleanup idempotently. Never assume deleting the Firestore project removed its Cloudinary assets or subcollections.

### “A photo uploaded but does not appear”

Distinguish image-processing failure, Cloudinary upload failure, metadata-write failure, preset rejection, and stale cached project data. Check for an orphaned Cloudinary asset when metadata creation failed.

### “The app opens blank offline”

Determine whether the application shell was cached, whether the user had previously loaded data on that browser, whether persistent Firestore cache initialization failed, and whether a service-worker update invalidated required assets.

### “Completion is stuck”

Read the internal operation marker and resume from its recorded stage. Verify that missing descendants are treated as already cleaned and that the project is not shown as an editable WIP during cleanup.

### “Permission denied”

Record the Firebase error code, current UID, attempted document/storage path, operation, and emulator-rule result. Never weaken production rules merely to make the error disappear.

## 16. Data evolution

Every persisted document includes or inherits a schema version. Schema changes require:

1. a documented old and new shape;
2. a read path that can identify old data;
3. an idempotent migration or compatibility adapter;
4. emulator-backed migration tests;
5. a rollback or recovery plan before production data is transformed.

V2 tagging should add tag documents or validated tag values and project associations without merging distinct projects. Grouping Frog, Bear, and Octopus under `amigurumi` changes organization, not image-storage consumption.

## 17. Architecture decision log

| ID | Decision | Status | Rationale |
|---|---|---|---|
| ADR-001 | Build a PWA rather than a native app | Accepted | Avoids Apple membership and App Store dependency while remaining installable on iPhone. |
| ADR-002 | Use Firebase Authentication and Firestore | Accepted | Provides identity, a document database, offline-aware synchronization, and multi-device access. |
| ADR-003 | Use email/password authentication | Accepted | Free, cross-device, and independent of paid Apple configuration. |
| ADR-004 | Use Firestore-generated string IDs | Accepted | Natural fit for cloud-created documents and future multi-device writes. |
| ADR-005 | Model work as root sections containing named counters | Supersedes the earlier adjacency-list tree | Matches crochet workflows while reducing mobile UI and Firestore complexity. Existing nested records are flattened for compatibility. |
| ADR-006 | Derive section completion | Accepted | Avoids inconsistent duplicated completion state. |
| ADR-007 | Permanently remove working data at completion | Accepted | Completed album retains only desired presentation data; warning and restart-safe cleanup are required. |
| ADR-008 | Reactivation creates a new active instance | Accepted | Preserves the completed album record while allowing another attempt/version. |
| ADR-009 | Store only optimized completed-project photos | Accepted | Controls cost and makes photos independent of the phone library. |
| ADR-010 | Defer tags/categories to v2 | Accepted | Keeps v1 focused; data model remains extensible. |
| ADR-011 | Use Firestore browser persistence with visible sync state | Accepted | Provides useful temporary offline behavior without a second database. |
| ADR-012 | No automatic inventory deduction in v1 | Accepted | Avoids premature unit-conversion and partial-skein complexity. |
| ADR-013 | Use Vinext and Vite for the initial PWA | Accepted | The pinned project scaffold supplies strict TypeScript, React, Vite, a production build, and Sites-compatible local tooling. |
| ADR-014 | Use `vite-plugin-pwa` with a hand-authored service worker | Accepted | `injectManifest` supports deliberate app-shell caching without broadly caching authenticated Firebase responses or Cloudinary photographs. |
| ADR-015 | Use Vitest, React Testing Library, Playwright, and Firebase Emulator Suite | Accepted | The tools cover pure rules, rendered components, complete browser flows, and Firebase security and persistence boundaries respectively. |
| ADR-016 | Use verified email/password authentication with optional persistent login | Accepted | It preserves standard Firebase security and recovery while allowing the installed personal PWA to remain signed in when requested. |
| ADR-017 | Store photos in Cloudinary and their references in Firestore | Accepted | Keeps v1 cloud-first on no-billing plans while providing image processing and delivery; public photo URLs are an accepted privacy trade-off. |
| ADR-018 | Use constrained unsigned browser uploads and server-side deletion | Accepted | Direct uploads avoid exposing a secret, while authenticated deletion keeps the Cloudinary API secret out of the PWA. |

## 18. Open implementation questions

These do not block the product design and must be resolved in Milestone 0 or the named feature milestone:

- Hosting provider and deployment workflow; Firebase Hosting is a candidate, not yet a locked choice.
- Exact supported image output format after browser/iPhone compatibility testing.
- Whether App Check can be enabled without compromising the PWA development workflow.
- Practical Firestore batch sizing and cleanup-operation representation.
- Exact visual language for the bookshelf, notebooks, album, and inventory entry point.

Each resolution must update this document and, when architectural, add an ADR row.

