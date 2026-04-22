# Backend (FastAPI)

当前仓库已迁移至 GitHub：<https://github.com/hhbhw/QSLSENTSYS>

## 1. Setup

1. Create and activate virtual environment.
2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Create `.env` from `.env.example` and adjust values.

## 2. Run

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## 3. Default admin

The first startup creates one admin account based on environment variables:
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`

## 4. API

- `POST /api/v1/auth/login`
- `GET /api/v1/users/me`
- `POST /api/v1/records`
- `GET /api/v1/records?callsign=BG1XXX`
- `PATCH /api/v1/records/{id}`
- `GET /api/v1/records/public?callsign=BG1XXX`
- `GET /api/v1/users` (admin)
- `POST /api/v1/users` (admin)
- `PATCH /api/v1/users/{id}` (admin)
- `POST /api/v1/users/{id}/reset-password` (admin)
