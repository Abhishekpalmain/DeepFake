# Quick Setup & Deployment Guide

## 🚀 Single-folder project (Deepfake Shield)

All code, docs, and the presentation live in this repo. From the **repo root**:

### 1. Backend (API + ML)
```bash
cd backend
pip install -r requirements.txt
# Set .env (copy from ../.env.example) with DATABASE_URL, SECRET_KEY, etc.
python -m uvicorn main:app --reload
```
API: http://localhost:8000 — Docs: http://localhost:8000/docs

### 2. Regenerate presentation (optional)
```bash
# From repo root
pip install -r scripts/requirements-ppt.txt
python scripts/build_presentation.py
```
Output: `DeepfakeShield_Presentation.pptx` in the repo root.

### 3. Docker (if you use docker-compose)
```bash
docker-compose up -d
```

### 4. Environment variables
Copy `.env.example` to `.env` in the repo root and set at least:
- `DATABASE_URL` — PostgreSQL connection string
- `SECRET_KEY` — for JWT signing

See `.env.example` for full list (Redis, AWS, CORS, rate limiting, etc.).

## 📊 What’s in this repo

- **backend/** — FastAPI app, ML detection, DB, auth, rate limiting
- **scripts/** — PPT generator (python-pptx)
- **docs/** — Setup, presentation guide, slide content
- **DeepfakeShield_Presentation.pptx** — HackNova deck (Team: The Sopranos)
- **README.md**, **LICENSE**, **.gitignore**, **.env.example**, **docker-compose.yml**

## 🏆 HackNova

- Use **DeepfakeShield_Presentation.pptx** for submission.
- Fill in team details in the script if needed and re-run `python scripts/build_presentation.py`.
- Backend runs from `backend/` with `uvicorn main:app --reload`.

Good luck! 🛡️
