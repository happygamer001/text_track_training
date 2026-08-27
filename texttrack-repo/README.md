# TextTrack

SMS-based training delivery platform for Chipperfield Ag / MCI field employees, with an admin
monitoring dashboard and a text-first employee experience.

This repo is a **starter skeleton**, not a finished app. Routes and lib files contain working
scaffolding plus `// TODO` markers for the logic that still needs to be implemented. Treat this as
the structure to build inside, not a drop-in finished product.

## Stack

- **Framework:** Next.js (App Router) — one codebase serves both the employee and admin sides
- **Styling:** Tailwind CSS
- **Database:** PostgreSQL via Prisma ORM
- **SMS:** Twilio (Programmable Messaging)
- **Hosting:** Vercel
- **Video:** hosted externally (Bunny Stream recommended) — this repo only stores links/IDs, not
  video files themselves
- **Content authoring (optional):** Notion, synced into the database via `scripts/import-curriculum.ts`
  rather than queried live — see the planning report for why

## Two sides, one app

- `src/app/(employee)/` — everything a field employee sees: progress, courses, message history,
  notices, profile
- `src/app/(admin)/` — everything an admin/manager sees: overview, roster, statistics, track
  management, enrollment, comments, support
- `src/app/enroll/` — the sign-up/consent flow a new employee goes through once, before landing in
  `(employee)/` for the first time (see the Enrollment Flow PDF)

## Getting started

```bash
npm install
cp .env.example .env        # fill in real values — see below
npx prisma migrate dev      # creates the database tables
npm run db:seed             # loads one sample track + employee to test with
npm run dev
```

The seed script prints a URL like `/enroll/confirm?id=...` — open that locally
(`http://localhost:3000/enroll/confirm?id=...`) to walk through the real enrollment
and consent flow end-to-end against your own database.

## Environment variables

See `.env.example` for the full list. At minimum you'll need:

- `DATABASE_URL` — your Postgres connection string
- `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_MESSAGING_SERVICE_SID`
- `SESSION_SECRET` — random string used to sign employee/admin session tokens
- `ADMIN_MFA_ISSUER` — display name shown in admin authenticator apps

## Security model (short version — see the Security & Content Architecture PDF for the rest)

- **Employees** log in with a phone number + a 6-digit SMS one-time code. No password to manage or
  leak. Codes expire in 10 minutes, allow 5 failed attempts before requiring a new code, and are
  rate-limited per phone number and per IP.
- **Admins** log in with email + password + required MFA. Role-based access controls what each
  admin can see and edit.

## Deploying

This is built to deploy straight to Vercel. Connect the GitHub repo in the Vercel dashboard, set
the environment variables there, and every push to `main` deploys automatically.

## What's built vs. what's still ahead

Milestone 5 (Enrollment & consent flow) is implemented and type-checks cleanly end to end:

- `src/app/enroll/confirm/page.tsx` — the Confirm Profile screen
- `src/app/enroll/consent/page.tsx` — the SMS consent screen (unchecked by default,
  disclosures on-screen, enrollment completes either way)
- `src/app/enroll/outcome/page.tsx` — the branch result screen
- `src/app/api/enrollment/[id]/route.ts` — fetch/save the pre-filled profile
- `src/app/api/consent/route.ts` — records consent, fires the double opt-in text

Learning material storage (admin upload + employee read-only library) is also built:

- `ContentAsset` in `prisma/schema.prisma` — versioned material per topic. Uploading a
  replacement retires the old version instead of deleting it, so there's a history of
  what changed and when.
- `src/app/(admin)/content/page.tsx` + `src/components/admin/ContentUploadForm.tsx` —
  admins upload handouts/documents directly (stored on Vercel Blob), or paste a Bunny
  Stream link for video. Video is intentionally never routed through the upload
  endpoint — see the comment in `api/admin/content/upload/route.ts` for why.
- `src/app/(employee)/courses/page.tsx` — read-only for employees: view or re-watch
  any topic's current material, anytime. No edit or delete controls exist on this page.

Everything else in the repo tree (admin roster/statistics/enrollment pages, employee
home/messages/notices, and the `auth.ts` session logic beyond what's stubbed) is still
ahead — see the Launch Checklist PDF for the full milestone list.

## Trying it locally

After `npm run db:seed`, the script prints three URLs to try:

- `/enroll/confirm?id=...` — the enrollment flow
- `/courses?id=...` — the employee's read-only course library, pre-loaded with one
  sample video asset
- `/content?adminId=...` — the admin Content Manager, where you can upload a
  replacement for that sample asset and watch the old version get retired


