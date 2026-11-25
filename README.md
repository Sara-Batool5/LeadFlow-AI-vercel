# LeadFlow AI (Next.js on Vercel)

AI-powered lead qualification, routing and follow-up drafting. Next.js 14 (App Router) + Tailwind + Neon PostgreSQL + Groq.

**Features:** landing page with cursor-reactive agent arrows · dashboard overview with interactive chart · CSV import · lead intake with duplicate detection · AI qualification · 8-agent workflow · owner routing (industry match → General Business fallback → workload balance) · email drafts with human approval (nothing is ever sent) · activity & audit trail · password-protected dashboard.

## Environment variables
Set these in **Vercel → Project → Settings → Environment Variables** (see `.env.example`):

| Name | Value |
|---|---|
| `NEON_DATABASE_URL` | Your Neon connection string (the pooled one is best for Vercel) |
| `GROQ_API_KEY` | Your Groq key |
| `GROQ_MODEL` | Optional, default `openai/gpt-oss-120b` |
| `AUTH_SECRET` | Long random string used to sign sessions (falls back to `APP_PASSWORD` if unset) |
| `ADMIN_EMAIL` | Your email. Signing in with it + `APP_PASSWORD` opens your existing leads |
| `APP_PASSWORD` | The owner password for `ADMIN_EMAIL` |

## Accounts
- **Anyone** can create an account on the Sign in page. Each account gets a private workspace, so users never see each other's leads.
- **Try the demo** logs into a shared sandbox with sample data (refreshed every 6 hours, AI actions capped at 30 per 24 hours).
- Regular accounts are capped at 200 AI actions per 24 hours to protect your Groq key. The owner is unlimited.
- On first use the app creates an `app_users` table and adds a nullable `workspace_id` column to `leads`, `sales_owners` and `workflow_events`. Nothing is deleted or renamed. Your existing rows are assigned to the owner on the first `ADMIN_EMAIL` sign-in.

## Deploy
1. Create a new GitHub repository and upload everything in this folder (`.env` files are git-ignored; never commit secrets).
2. In Vercel: **Add New → Project → import the repo** (Framework preset: Next.js, no build settings to change).
3. Add the environment variables above, then **Deploy**.
4. Open the site, click **Open Dashboard**, sign in with `ADMIN_EMAIL` + `APP_PASSWORD`, and check **Setup** — both rows should be green.

## Database
This app uses the **same tables** as the Streamlit version (`leads`, `sales_owners`, `qualification_results`, `email_drafts`, `workflow_events`). Point `NEON_DATABASE_URL` at the existing database, or at a Neon *branch* of it for safe testing. See "Accounts" above for the small additive schema change made on first run.

## Local run (optional)
```
npm install
cp .env.example .env.local   # fill in values
npm run dev
```

## Notes
- CSV import accepts up to 200 rows per upload; leads whose email already exists are skipped.
- Long AI routes set `maxDuration = 60`. If your Vercel plan caps functions lower, the full workflow may time out; run steps individually from the lead panel.
