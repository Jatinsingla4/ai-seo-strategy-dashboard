# AI SEO Strategy Dashboard

AI-powered SEO keyword analysis tool. Upload a CSV of keywords, let Gemini AI cluster them into semantic pillars, identify content opportunities, run competitor gap analysis, and generate an internal linking strategy.

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 15, React 19, next-auth v5, tRPC client, Recharts |
| API | Cloudflare Workers, tRPC, D1 (SQLite), Zod |
| Realtime | Cloudflare Durable Objects (WebSocket) |
| AI | Google Gemini 2.0 Flash |
| Auth | Google OAuth via NextAuth |

## Quick Start

### Prerequisites

- Node.js 20+ (see `.nvmrc`)
- Wrangler CLI: `npm i -g wrangler`
- A Google Cloud project with OAuth 2.0 credentials
- A Google Gemini API key from [AI Studio](https://aistudio.google.com/app/apikey)

### 1. Clone and install

```bash
cd frontend && npm install
cd ../backend/api && npm install
```

### 2. Configure environment

```bash
# Frontend
cp frontend/.env.example frontend/.env.local
# Fill in: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, AUTH_SECRET, NEXTAUTH_URL

# Backend
cp backend/api/.dev.vars.example backend/api/.dev.vars
# Fill in: GEMINI_API_KEY, GOOGLE_CLIENT_ID, BROADCAST_SECRET
```

Generate `AUTH_SECRET` and `BROADCAST_SECRET`:
```bash
openssl rand -base64 32
```

### 3. Create D1 database

```bash
cd backend/api
wrangler d1 create threezinc-db
# Copy the database_id into wrangler.toml
wrangler d1 migrations apply threezinc-db
```

### 4. Start dev servers

```bash
# Terminal 1 — API (port 8787)
cd backend/api && npm run dev

# Terminal 2 — Frontend (port 3000)
cd frontend && npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Production Deployment

### Backend (Cloudflare Workers)

```bash
cd backend/api

# Set all secrets
wrangler secret put GEMINI_API_KEY
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put FRONTEND_ORIGIN      # e.g. https://yourdomain.vercel.app
wrangler secret put BROADCAST_SECRET
wrangler secret put REALTIME_URL         # e.g. https://realtime.yourworker.workers.dev

# Apply migrations to production D1
wrangler d1 migrations apply threezinc-db --remote

# Deploy
wrangler deploy
```

### Frontend (Vercel)

1. Connect the repo in Vercel.
2. Set root directory to `frontend/`.
3. Add environment variables in Vercel dashboard (see `frontend/.env.example`).
4. Set `NEXT_PUBLIC_REALTIME_URL` to `wss://<your-realtime-worker>.workers.dev`.
5. Deploy.

## Security Notes

- **Rotate any previously exposed secrets** before going live.
- All API endpoints require either a verified Google `id_token` or strict Zod-validated input.
- Database queries always include `user_id` to prevent cross-tenant data access.
- The realtime `/broadcast` endpoint is protected by a shared `BROADCAST_SECRET`.
- Security headers (HSTS, CSP, nosniff, X-Frame-Options) are set on both frontend and API.

## CSV Format

The upload panel accepts CSV files with these columns:

| Column | Required | Description |
|---|---|---|
| `keyword` | Yes | The keyword string |
| `volume` | Yes | Monthly search volume (integer) |
| `difficulty` | Yes | SEO difficulty 0–100 |

## License

Private — all rights reserved.
