# V2 zero-cost release requirement

The owner requires ongoing hosting and app services to cost zero. Do not enable billing, upgrade plans, add paid services or paid add-ons to ship v2. If a free limit prevents operation, report the limitation and find a free alternative; do not silently upgrade.

## Release checks (2026-09-27)

- V2 has not been deployed. Cloudflare CLI sign-in is verified; its token cannot read subscriptions, so Workers Free needs dashboard confirmation.
- The existing production target is `hooked.silviparlani-05.workers.dev`.
- Local Wrangler deployment dry-run succeeded: compressed Worker upload 467.71 KiB; no resource bindings. This does not verify runtime CPU usage or account billing.
- V2 adds no D1/R2 resource or other paid service. Journal rendering and page animations run in the browser. Materials use the existing Firestore database; photos use the existing Cloudinary integration.
- Provider checks: Google Cloud Billing API reports billingEnabled=false and no linked billing account for hooked-crochet-tracker. Cloudinary Admin API reports plan Free, 0.2 of 25 credits used (0.8%). Cloudflare subscription lookup is denied for the CLI token; confirm Workers Free in the dashboard before release. The reported standard usage model alone does not establish the subscription plan.
- Publish the matching Firestore rules and application together using the release procedure in design.md. Do not publish only the new UI.

## Free-plan constraints

Cloudflare Workers Free currently includes 100,000 requests per day and 10 ms CPU per invocation. Firebase Spark provides no-cost quotas; using a paid plan's free allowance is not a zero-charge guarantee. Cloudinary advertises its API Free plan at $0 without a credit card. These are finite service allowances, not unlimited capacity. Photos and new Firestore usage records consume quota. Free-plan limits may interrupt the app; preserving zero cost takes precedence over upgrading.

Provider pricing and account settings can change. Recheck these before release; code alone cannot guarantee future provider pricing or prevent an account owner changing billing settings.

Sources checked 2026-09-27:

- https://developers.cloudflare.com/workers/platform/pricing/
- https://firebase.google.com/docs/projects/billing/firebase-pricing-plans
- https://cloudinary.com/pricing

## Deployment update

The owner confirmed Workers Free in the dashboard. V2 rules and Worker were deployed on 2026-09-27; Worker version 6867ee7c-7480-4008-a2ce-c62a35fcbb1c. Live /, /wips and /stash returned HTTP 200. No billing plan was changed. Photo deletion returns 503 because runtime credentials are missing. Uploading the existing credentials as Worker secrets was blocked by automatic approval review pending explicit owner authorization. No credentials were uploaded by that rejected action.

## Photo API configuration completed

The owner explicitly approved transferring the existing five Firebase/Cloudinary configuration values to the Hooked Worker as encrypted secrets. All five uploads succeeded. Live checks returned HTTP 401 for both missing and invalid authentication, replacing the earlier missing-configuration 503; the home page returned HTTP 200. No user photos were accessed or deleted during these checks. Actual authenticated photo deletion remains a user acceptance check. No billing plan was changed. This resolves the credential-setup blocker recorded above.


## Someday-only reference image release — 2026-09-29

Published matching Firestore rules and Worker version `9c37e63b-638d-45ee-bf34-b6bbab63776e` after local application, emulator, browser, type/lint, build, and deployment dry-run checks passed. The change reuses existing Firebase and Cloudinary services with no added resource bindings, services, paid add-ons, or billing-plan changes. Existing Worker variables and secrets were preserved. Automated live verification performed page reads, compared a public JavaScript asset, and confirmed the unauthenticated deletion guard; it did not mutate user data.
