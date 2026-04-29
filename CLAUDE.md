# CLAUDE.md

This file defines the working conventions for Claude Code in this repository.

## 1. Project Snapshot

- Project: QSL Card Tracker (QSL 卡片发出记录系统)
- Stack:
  - Backend: FastAPI + SQLAlchemy + Pydantic + JWT
  - Frontend: React + Vite
  - DB: SQLite by default (`backend/qsl.db`), PostgreSQL optional
- Repo: https://github.com/hhbhw/QSLSENTSYS
- Production domain: `http://qsl.soyorin-love.xyz`

## 2. Repository Structure

- `backend/`: API service
- `frontend/`: web UI
- `deploy/`: deployment configs and docs
- `README.md`: project overview
- `deploy/ALIYUN_DEPLOYMENT.md`: ECS deployment reference

## 3. Key Runtime Facts

- Backend health endpoint is `GET /health` (not `/api/v1/health`).
- Public query page route is `/public-query`.
- Public query API is `/api/v1/records/public`.

## 4. Local Development Commands

Backend:

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Frontend:

```bash
cd frontend
npm install
npm run dev -- --host 0.0.0.0 --port 5173
```

## 5. Git Workflow

Before commit:

```powershell
git status
```

Commit and push:

```powershell
git add <files>
git commit -m "<message>"
git push origin main
```

If intermittent HTTPS push failure occurs:

```powershell
git config --global http.version HTTP/1.1
git push origin main
```

## 6. Server Update Workflow (ECS)

Use this after code is pushed to GitHub:

```bash
cd /opt/qsl-tracker/repo && git pull origin main && source /opt/qsl-tracker/venv/bin/activate && cd /opt/qsl-tracker/repo/backend && pip install -r requirements.txt && cd /opt/qsl-tracker/repo/frontend && npm install && VITE_API_BASE=http://qsl.soyorin-love.xyz/api/v1 npm run build && systemctl restart qsl-backend && nginx -t && systemctl restart nginx && curl http://127.0.0.1:8000/health
```

Service controls:

```bash
systemctl start qsl-backend nginx
systemctl stop qsl-backend nginx
systemctl status qsl-backend nginx --no-pager
```

## 7. Release Workflow

- Tags in use: `v1.0.0`, `v1.0.1`, `v1.0.2`, `v1.0.3`.
- For next release:
  1. Push `main`
  2. Create annotated tag
  3. Push tag
  4. Create GitHub Release from that tag
- Release notes should include all user-facing fixes since previous tag.

## 8. Preferences and Constraints

- Keep responses and code comments concise and practical.
- UI changes should prioritize direct operability (important controls visible without excessive scrolling).
- For each iteration, maintain local context notes in `HANDOFF.md`.
- `HANDOFF.md` and `help.md` are local-only docs and should never be committed.

## 9. Local-Only Files (Do Not Commit)

- `HANDOFF.md`
- `help.md`

These are already in `.gitignore`.

## 10. First Action for Any New Claude Session

1. Read `README.md` and `deploy/ALIYUN_DEPLOYMENT.md`.
2. Check `git status`.
3. Summarize current branch state and recent commits.
4. Propose the smallest safe implementation plan before editing.
