# Adifase '97 Class Elections Platform

React + Vite frontend for the Adifase '97 alumni election system. Currently uses `localStorage` as a stand-in data layer so the full flow can be tested before the real backend is wired in.

## Setup

```
npm install
cp .env.example .env
```

Edit `.env` and set your real admin credentials:

```
VITE_ADMIN_EMAIL=admin@adifase97.org
VITE_ADMIN_PASSWORD=YourStrongPassword
```

Then run:

```
npm run dev
```

## How it works

- `src/lib/db.js` — all data access (roles, participants, voters, votes, election status). Every function here is written the way a real API call would be (`db.getRoles()`, `db.castVote(...)`), so swapping localStorage for `fetch` calls later is a drop-in replacement: keep the same function names, just make them async and hit your backend.
- `src/lib/auth.js` — voter login (email/password against registered voters) and admin login (checked against `.env` values, never stored in localStorage in plaintext).
- Voter passwords are hashed client-side with SHA-256 before being stored. This is a placeholder for testing only — once the real backend exists, use bcrypt/argon2 server-side and drop this client-side hashing.

## Backend hookup

`src/lib/api.js` holds the single `API_BASE_URL` constant, read from `VITE_API_BASE_URL` in `.env`. Every data function lives in `src/lib/db.js` and is named the way a real endpoint would be (`getRoles`, `castVote`, `addVoter`...). When the backend is ready, replace the localStorage logic inside each function with a `fetch(`${API_BASE_URL}/...`)` call — component code doesn't need to change.

## Voter accounts

Two ways to get a voter account:
1. **Self sign-up** at `/signup` — name, email, password.
2. **Admin registers them** under Admin → Voters, with a temporary password.

Either way, login happens at `/login` with email + password.

## Election schedule

Admin sets the voting start/end date under **Admin → Voting Status**. The Home page countdown reads the start date directly — once it's reached, the countdown switches to "Voting is open now."

## Election flow (3 states)

1. **Ongoing** — voting open, leaderboard hides vote counts.
2. **Closed** — admin closes voting (e.g. to hold an offline results meeting). Leaderboard still hides counts.
3. **Published** — admin manually publishes. Leaderboard reveals vote counts and crowns the winner per role.

Controlled from **Admin → Voting Status**.

## Routes

| Route | Access |
|---|---|
| `/` | Public |
| `/login` | Public |
| `/poll` | Voter (logged in) |
| `/leaderboard` | Voter (logged in) |
| `/admin/login` | Public but unlinked — not in any nav |
| `/admin/*` | Admin session only |

## Security notes for the backend handoff

- Enforce one-vote-per-(user, role) **server-side**, not just in the UI.
- Rate-limit login attempts server-side too (frontend currently locks out after 5 failed tries for 60s, but that's bypassable client-side).
- Move admin auth to a real server-side check, never ship admin password comparisons to the browser bundle in production — `.env` values bundled by Vite are visible in the built JS. This setup is fine for local testing/demo only.
- Replace the SHA-256 client hash with proper server-side password hashing (bcrypt/argon2) once the backend exists.

## Stack

React 18, react-router-dom 6, Vite 5, plain CSS per page/component. No UI framework.
