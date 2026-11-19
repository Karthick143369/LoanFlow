# LoanFlow

An interview-focused lending workflow demo built with React, TypeScript, Next.js and PostgreSQL. Prepared for GitHub owner **Karthick143369** and Vercel deployment.

## Features

- Dashboard with database-derived pipeline counts and amounts.
- Search, status filters, pagination and CSV export.
- Validated two-step application form and editable saved drafts.
- Supporting document uploads and downloads, scoped to the current demo session.
- Customer → Officer → Manager workflow, checked server-side.
- Required reasons for recommendations, approvals and rejections.
- Persisted activity history, reviewer notes and optimistic concurrency checks.
- Signed, HttpOnly session cookies; isolated browser workspaces; same-origin write checks.
- Responsive UI and keyboard focus handling.
- Built-in workspace chatbot with follow-up context and application links.

This is a portfolio sandbox using fictional data. Persona switching is intentional; these are not independently provisioned staff accounts. A browser session is not a verified customer identity. Do not use real financial or identity information. Clearing cookies starts a new workspace; cross-device access and account recovery are not provided.

## Local setup

Use Node.js 22.13 or newer.

```sh
npm ci
npm run db:migrate
npm run dev
```

Open the local address printed by Next.js. With no DATABASE_URL, development uses PGlite, a local PostgreSQL sandbox persisted in `.loanflow-data/`. Production requires an external PostgreSQL database and never falls back to local disk.

To use an external database locally, copy `.env.example` to `.env.local`, set DATABASE_URL to its connection string, then run the commands above. Never commit credentials. `npm run dev` reads `.env.local`; `db:migrate` loads it explicitly.

## GitHub and Vercel deployment

1. Create a repository named `loanflow` under `Karthick143369` and push this source tree. The repository has not been created by this package.
2. In Vercel, import that repository and use the **Next.js** framework preset with Node.js 22.
3. Connect a PostgreSQL database, for example Neon from Vercel Marketplace. Confirm `DATABASE_URL` is available to the appropriate environment. Use the provider's pooled URL and recommended TLS settings.
4. Set **SESSION_SECRET** to a cryptographically random value of at least 32 characters. Generate one locally:

   ```sh
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

   Store it only in Vercel's environment variables or ignored `.env.local`. Do not paste it into source control.
5. Deploy. `vercel.json` runs `npm run db:migrate && npm run build`; a missing database or secret must be configured before the app can work. Migrations are idempotent CREATE statements for this initial schema. Later schema changes should use versioned, additive migrations.
6. Open the deployed URL, create a fictional application and walk through all three personas.

Use separate databases/branches for Preview and Production environments. Sharing a production database with untrusted preview branches is not recommended. Deploying this package does not automatically migrate data from the previous Cloudflare demo.

## Verification

```sh
npm test
npm run typecheck
npm run build
node tests/run-integration.mjs
```

The integration runner starts an isolated local PostgreSQL sandbox and Next.js server, tests the actual HTTP routes, then stops the server and removes the test database. It verifies session initialization, validation, file upload, complete approval and rejection paths, role restrictions, required reasons, stale updates, terminal states, audit notes and origin protection. It uses port 4012 and a separate `.next-integration` build directory.

To target an already running local development server instead:

```sh
TEST_BASE_URL=http://localhost:3000 node tests/workflow.mjs
```

The integration script only accepts loopback addresses. GitHub Actions runs unit tests, TypeScript checks and the Next.js build.

## Storage and design choices

The small demo uses one JSONB workspace record plus a separate documents table. Each update compares a version number to prevent lost updates. Document bytes and metadata are written atomically in PostgreSQL. Files are limited to 3 MB, five per application; workspaces are limited to 25 applications. These limits suit the demo and keep uploads below common serverless request limits. For larger workloads, use object storage with direct authenticated uploads, normalized relational tables, database-driven pagination and rate limiting.

The signed random session ID separates browser sandboxes without requiring visitors to create accounts. This differs from production staff authentication and authorization. The selected demo persona is deliberately switchable.

## Interview walkthrough

1. Customer: create a draft, edit it, upload a fictional income statement and submit.
2. Officer: start review, inspect supporting documents, recommend with a written reason.
3. Manager: approve or reject with a written reason.
4. Inspect Activity, refresh to show persistence, filter applications and export CSV.

Explain the workflow rules, concurrency protection, session boundaries and the choice of database versus object storage. Add a screen recording and measured performance results to your portfolio.

## Chatbot (new)

Click **Ask LoanFlow** at the bottom right. The built-in assistant answers from the current browser session's database records. No AI provider or additional API key is needed. It is a deterministic intent-based assistant, not a generative model.

Example questions:

- Summarize my workspace.
- How many applications are approved?
- Which applications need attention?
- Show Arjun Menon / Show LF-1048.
- Show loans above ₹5 lakh.
- Show documents for LF-1048.
- What is its next step? (after selecting an application in chat)
- Show activity for LF-1048.
- Which applications have no documents?
- Show recent activity.
- How do I upload documents?
- How does the approval workflow work?

Answers include application links and the workspace version/time used. Each question re-reads the server records; chat does not use the visible table filters. Transcript text remains in component memory until a new chat or page reload. No chat transcript is persisted to the database or sent to an outside provider.

The endpoint uses the existing signed session and same-origin checks. It reads only that workspace and cannot approve, reject, edit, or submit applications. Attachment answers list metadata only; the assistant does not extract PDF/text/image contents. It does not search the internet, filter by date, calculate EMI, or decide credit eligibility. Unsupported questions return an explicit limitation. A generative AI provider can be added later behind the same server boundary if required.

The update adds `/api/chat`, `lib/chat.ts`, `components/workspace-chat.tsx`, styles, domain tests and HTTP integration checks. There are no new environment variables or database migrations.

### Update your existing GitHub/Vercel project

Replace the source files with this archive's contents, keeping your existing local `.env.local` and Vercel environment settings. Do not upload `node_modules`, `.next`, local database files or environment secrets. Commit and push to the GitHub branch connected to Vercel; Vercel will build the new version. If you upload through GitHub's web interface, include the new `components/workspace-chat.tsx`, `lib/chat.ts`, and `app/api/chat/route.ts` files as well as the modified files. This archive does not change the previous hosted demo automatically.

## Not implemented

No generative AI model, credit scoring, email/SMS delivery, real-time synchronization, malware scanner, separate staff account provisioning or immutable compliance ledger. Do not claim these features or unmeasured performance metrics on a resume.
