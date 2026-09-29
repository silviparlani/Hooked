# Continue Hooked on a Mac

1. Clone the GitHub repository after the latest Windows source changes have been pushed.
2. Privately copy app/.env.local from Windows to app/.env.local on the Mac. Never commit or paste its values into chat.
3. Install Node.js 22.13 or newer. From the app directory, run npm ci, then npm run dev.
4. Open the repository folder as a local project in Codex. Ask it to read README.md and docs/v2/design.md, plan.md and costs.md before editing.
5. For deployment, sign into the same Cloudflare account with npx wrangler login and Firebase account with npx firebase login. Existing production Worker secrets stay on Cloudflare; do not copy Windows CLI login files.

The live app uses the existing Firebase project and Cloudinary account. Moving source files does not migrate or reset user data. Keep Workers Free, Firebase billing disabled, and Cloudinary Free. Do not enable paid services.

Git transfers source and project documents, not the Codex conversation history. Reinstall dependencies on macOS rather than copying Windows node_modules.

Verification commands (inside app): npm run typecheck, npm run lint, npm test, npm run build. Firebase emulator tests additionally need Java 21 or newer. Browser test configuration currently selects Microsoft Edge outside CI; install Edge or adjust the browser configuration for your Mac before running those checks.
