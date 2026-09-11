# Hooked

Hooked is a private, cloud-first crochet project tracker designed as an installable progressive web app. It organizes active work, completed pieces, inspiration, and yarn inventory.

The product and architecture baseline lives in [`../design.md`](../design.md). Strategic milestones and test scenarios live in [`../plan.md`](../plan.md).

## Prerequisites

- Node.js 22.13 or newer
- npm

Firebase uses the isolated `demo-hooked` Emulator Suite project for automated development tests and `hooked-crochet-tracker` for production. Never run emulator-mode tests with the production project ID.

## Local development

1. Copy `.env.example` to `.env.local` when Firebase configuration begins.
2. Install dependencies with `npm install`.
3. Start the local app with `npm run dev`.
4. Open the local address printed in the terminal.

## Quality checks

- `npm run typecheck` — strict TypeScript checking
- `npm run lint` — source linting
- `npm run format` — source formatting
- `npm test` — run unit and component tests once
- `npm run test:watch` — rerun unit and component tests while editing
- `npm run test:e2e` — test complete browser flows at desktop and iPhone sizes
- `npm run test:firebase` — start an isolated Firestore emulator and verify security rules
- `npm run build` — production build

The first browser-test run may require `npx playwright install chromium` to install its isolated browser. Firebase emulator tests require Java 21 or newer; they always use the non-production `demo-hooked` project ID.

## Architecture boundaries

- `app/` — routes and page composition
- `components/` — reusable interface components
- `lib/domain/` — pure business rules and validation
- `lib/application/` — use cases coordinating domain and persistence
- `lib/repositories/` — persistence contracts
- `lib/firebase/` — Firebase-specific adapters and converters

Pages and components must not construct Firestore paths directly. Firebase-specific code remains behind repository implementations.

## Sensitive data

Do not commit `.env.local`, passwords, authentication tokens, private project text, or personal photographs. Firebase web identifiers are not server secrets, but environment files remain ignored so development and production configuration cannot be confused accidentally.
