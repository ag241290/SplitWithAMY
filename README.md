# SplitWithAMY

SplitWithAMY is a Splitwise-like expense tracking demo built on Supabase using a client-only architecture (no traditional backend). It includes:
- Secure table-based auth via custom headers
- PostgreSQL RLS policies for isolation
- A minimal React UI to manage trackers, participants, expenses, and balances

## Tech Stack
- Supabase (PostgreSQL, Row Level Security, SQL functions)
- React + Vite + TypeScript
- supabase-js v2

## Repository structure
- `DB.md` – Run this in Supabase SQL editor to create schema, functions, RLS policies, grants, and the balances view.
- `ui/` – Vite React app.
  - `src/modules/App.tsx` – Basic Admin and Tracker flows.
  - `.env.example` – Example environment values.

## Prerequisites
- Supabase project (URL and anon key)
- Node.js 18+

## Setup: Database
1. Open Supabase SQL editor.
2. Copy all SQL from `DB.md` and run it.
3. Optionally seed an admin:
   - In `DB.md`, uncomment the seed snippet and run once:
     ```sql
     insert into admin_users(username, password)
     values ('admin', 'CHANGE_ME');
     ```
4. Confirm functions and RLS are created. `DB.md` also includes GRANTs so the UI can call RPCs.

## Setup: UI
1. Copy `ui/.env.example` to `ui/.env` and fill values:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
2. Install and run:
   ```bash
   cd ui
   npm install
   npm run dev
   ```
3. Open http://localhost:5173.

## Usage
Admin panel:
- Login with `admin_login` RPC (uses `x-admin-token` header internally).
- Create a tracker, add participants, add tracker credentials.

Tracker panel:
- Login with `tracker_login` RPC (uses `x-tracker-token` header).
- Load participants, add an expense with equal/custom split, fetch balances from `tracker_balances` view.

## Balance Summary logic
The Tracker page has a Balance Summary popup with the following derived sections:

- Individual expenses
  - Source: `tracker_balances.total_owed` per participant.
  - Represents how much each participant owes based on recorded expenses/splits.

- Paid by
  - Base: `tracker_balances.total_paid` per participant.
  - Adjusted by Payment Entries (local UI log): for each payment,
    - Add amount to the payer (`byId`), subtract amount from the payee (`toId`).
  - Display shows final signed value with color (green for +, red for ?).

- Receivables
  - Computed per participant as `(final_paid) ? (total_owed)` where `final_paid` includes payment adjustments.
  - Shows signed value with color (green for +, red for ?).
  - Positive means the participant should receive money; negative means they should pay.

- Who pays whom
  - Derived from Receivables using a greedy settlement algorithm:
    - Build `creditors` (positive receivables) and `debtors` (negative receivables as positive amounts).
    - Iterate and match payments: `pay = min(debtor.amount, creditor.amount)`; reduce both; advance indices when settled.
    - Produces a list of settlements `{ from, to, amount }` such that total positive equals total negative within tolerance.
  - This uses the same payment-adjusted receivable values to ensure consistency.

Notes:
- Payment entries currently live only in UI state (not persisted). They adjust the summary for the active session.
- All currency math uses plain Number with small tolerances (e.g., 0.0001) to avoid floating-point noise.

## Demo credentials
- Supabase admin credentials: username `admin`, password `RashmiGugale@13`
- Use the same credentials for Admin login in the app.

## Troubleshooting
- Blank page or no network calls:
  - Ensure `ui/.env` exists and you restarted the dev server after creating/updating it.
  - Browser DevTools Console should show an environment warning if vars are missing.
- RPC call errors:
  - Verify you ran the full SQL in `DB.md` and functions exist.
  - Check RLS policies and GRANTs in `DB.md`.
- CORS/auth issues:
  - Confirm your Supabase URL and anon key are correct.

## Security notes
- For this internal demo, passwords and session tokens are stored in plaintext in the DB. Do not use this setup in production.
- Custom headers `x-admin-token` and `x-tracker-token` are used by the UI.
- `expenses.paid_by` is constrained to participants of the same tracker via composite FK.

## License
This project is for educational/demo purposes.
