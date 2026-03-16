# Alan Fraud Detection System

A fraud detection dashboard for Alan (French health insurer), focused on optical-care claims (Lunettes & Lentilles).

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript + Tailwind CSS + Recharts |
| Backend | FastAPI + Tortoise ORM + Aerich migrations |
| Database | PostgreSQL 15 |
| Auth | Clerk (production) + hardcoded demo login |
| Infra | Docker Compose |

---

## Quick Start (Docker)

```bash
# 1. Copy and configure env
cp .env.example .env
# Edit .env if you have Clerk keys (optional for demo mode)

# 2. Start everything
docker compose up --build

# 3. Open the app
open http://localhost:3000
```

The backend seeds itself on first start with 12 providers and their full claims history.

---

## Demo Login

Go to `http://localhost:3000/login` and use:

| Field | Value |
|---|---|
| Username | `alanadmin` |
| Password | `alanadmin` |

This bypasses Clerk entirely and sets a session cookie for demo mode.

---

## Local Development (without Docker)

### Backend

```bash
cd backend

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Set up PostgreSQL (must be running locally)
export DATABASE_URL="postgres://alan:alan@localhost:5432/alandb"

# Run the server (auto-seeds on first start)
uvicorn app.main:app --reload --port 8000
```

API docs available at `http://localhost:8000/docs`

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:8000

# Run dev server
npm run dev
```

App available at `http://localhost:3000`

---

## API Reference

All endpoints require either:
- `X-Demo-Token: alanadmin` header (demo mode), OR
- `Authorization: Bearer <clerk_jwt>` header (production)

| Method | Path | Description |
|---|---|---|
| GET | `/api/providers` | List all providers with risk scores |
| GET | `/api/providers/{id}` | Provider detail + claims + flags + reviews |
| POST | `/api/providers/{id}/review` | Submit review action |
| GET | `/api/claims` | List claims (filterable) |
| POST | `/api/claims/import` | Import CSV |
| POST | `/api/detection/run` | Trigger fraud detection |
| GET | `/api/dashboard/stats` | Dashboard stats |
| GET | `/api/dashboard/alerts` | Providers needing attention |
| GET | `/api/reviews` | Recent review actions |
| GET | `/health` | Health check (no auth) |

---

## Detection Rules

**1. Monthly Spike** (`+40 pts`)
> For each provider/category/month: if current month > 5× 6-month rolling median → flag

**2. Dual Product** (`+30 pts`)
> If provider bills both Lunettes AND Lentilles in the same month → flag

**3. Repeated Amount** (`+30 pts`)
> If the same euro amount appears 3+ times in a 12-month window for same provider+category → flag

**Risk routing:**
- Score < 30 → `auto_approved`
- Score 30–70 → `needs_review`
- Score > 70 → `auto_held`

---

## CSV Import Format

```csv
provider_name,member_id,month,year,category,amount
"Kylian's frames",MBR-1234,1,2023,Lunettes,299.91
"Kylian's frames",MBR-1235,1,2023,Lentilles,380.00
```

Categories must be exactly `Lunettes` or `Lentilles`.

---

## Frontend Pages

| Route | Description |
|---|---|
| `/login` | Demo login + Clerk sign-in |
| `/dashboard` | Stats, charts, recent activity |
| `/providers` | Provider table with risk scores |
| `/providers/:id` | Detail view: claims, flags, review actions |
| `/import` | CSV drag-and-drop importer |

---

## Environment Variables

### Root `.env`
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

### Backend (inherits from compose or set manually)
```env
DATABASE_URL=postgres://alan:alan@postgres:5432/alandb
CLERK_SECRET_KEY=sk_test_...
DEMO_TOKEN=alanadmin
```

### Frontend
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
```
