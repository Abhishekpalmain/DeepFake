# 🛡️ Deepfake Shield

**AI-powered deepfake detection for images, videos and audio.**  
Built for HackNova 2026 · Team: The Sopranos

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

---

## Features

| Feature | Details |
|---------|---------|
| 🖼️ Image Detection | JPEG, PNG, WebP |
| 🎬 Video Detection | MP4, AVI, MOV |
| 🎙️ Audio Detection | MP3, WAV, OGG, FLAC — voice-clone analysis |
| 📊 Dashboard | Analytics, charts, recent detections |
| 🎯 Confidence Score | Color-coded: Authentic / Uncertain / Fake |
| 📍 Flagged Regions | Face region detection with bounding boxes |
| 📥 Report Download | Export results as JSON |
| 🚀 Render-ready | One-click deploy via `render.yaml` |

---

## Quick Start (Local Dev)

### 1. Backend

```bash
cd deepfake-shield
pip install -r backend/requirements.txt

# Copy env config
cp .env.example .env          # file deepfake_shield.db is created automatically

# Run
uvicorn backend.main:app --reload
# API available at http://localhost:8000
# Swagger docs at http://localhost:8000/api/docs
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
# Opens at http://localhost:5173 (proxies /api → port 8000)
```

---

## Deploying to Render.com

1. Push this repo to GitHub
2. Go to [render.com](https://render.com) → **New → Blueprint**
3. Connect your GitHub repo → Render reads `render.yaml` automatically
4. Click **Apply** — Render creates the web service + PostgreSQL database
5. Done ✅

The `render.yaml` blueprint:
- Installs Python deps + builds the React frontend
- Starts FastAPI with `uvicorn`
- Provisions a free PostgreSQL database and injects `DATABASE_URL`

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/detect/image` | Scan an image |
| `POST` | `/api/v1/detect/video` | Scan a video |
| `POST` | `/api/v1/detect/audio` | Scan audio for voice clones |
| `GET` | `/api/v1/results/{id}` | Poll for result |
| `GET` | `/api/v1/analytics/summary` | Dashboard stats |
| `GET` | `/api/v1/recent` | Recent detections |
| `GET` | `/api/health` | Health check |
| `GET` | `/api/docs` | Swagger UI |

### Example

```python
import requests, time

# Upload image
r = requests.post('http://localhost:8000/api/v1/detect/image',
    files={'file': open('face.jpg', 'rb')})
req_id = r.json()['request_id']

# Poll for result
while True:
    res = requests.get(f'http://localhost:8000/api/v1/results/{req_id}').json()
    if res['status'] != 'processing':
        break
    time.sleep(1.5)

print(f"Verdict: {res['confidence_label']} ({res['confidence']*100:.1f}%)")
```

---

## Confidence Thresholds

| Score | Label | Meaning |
|-------|-------|---------|
| 0–39% | 🟢 Authentic | No significant manipulation detected |
| 40–69% | 🟡 Uncertain | Anomalies present — manual review recommended |
| 70–100% | 🔴 Fake | High probability of AI-generated content |

---

## Tech Stack

**Backend:** Python 3.9+, FastAPI, SQLAlchemy, OpenCV, librosa  
**Frontend:** React 18, TypeScript, Vite, Recharts, Lucide Icons  
**Database:** SQLite (local) / PostgreSQL (Render)  
**Deployment:** Render.com (single service, free tier compatible)

---

## Project Structure

```
deepfake-shield/
├── backend/
│   ├── core/          # Config, database, auth
│   ├── models/        # SQLAlchemy + Pydantic schemas
│   ├── services/      # Detection engine, file service
│   └── main.py        # FastAPI entry point
├── frontend/
│   └── src/
│       ├── pages/     # Upload, Result, Dashboard
│       └── components/
├── render.yaml        # Render Blueprint
└── .env.example
```

---

## Team

**The Sopranos** — HackNova 2026, CyberTech Track  
Mentor feedback fully implemented: confidence UI, wireframe flow, audio layer, REST API.

---

*MIT License*
