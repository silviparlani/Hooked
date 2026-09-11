# Cloudinary boundary

Direct browser uploads, response validation, and short-lived delete-token cleanup belong here. Firestore photo documents store the returned public ID and delivery metadata; they never store image bytes.

Only the cloud name and unsigned preset name may reach browser code. Permanent deletion requires a separate authenticated server endpoint so the Cloudinary API secret is never bundled with the PWA.
