import uuid
import time
from datetime import datetime
from typing import Dict, List

from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from .core.config import settings
from .core.database import create_tables, get_db
from .models.schemas import DetectionResponse, HealthResponse, AnalyticsSummary, RecentDetection
from .services.detection_service import DetectionService
from .services.file_service import FileService
from .utils.logger import get_logger
import os

logger = get_logger(__name__)

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Deepfake Shield API",
    description="AI-powered deepfake detection — images, videos, and audio.",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

create_tables()

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Services
# ---------------------------------------------------------------------------

detection_service = DetectionService()
file_service = FileService()

# ---------------------------------------------------------------------------
# Rate limiting (in-memory, per-IP)
# ---------------------------------------------------------------------------

_rate_store: Dict[str, List[float]] = {}


def _check_rate_limit(client_ip: str) -> None:
    if settings.RATE_LIMIT_REQUESTS <= 0:
        return
    now = time.time()
    window_start = now - settings.RATE_LIMIT_WINDOW
    ts = [t for t in _rate_store.get(client_ip, []) if t >= window_start]
    if len(ts) >= settings.RATE_LIMIT_REQUESTS:
        raise HTTPException(status_code=429, detail="Rate limit exceeded — slow down")
    ts.append(now)
    _rate_store[client_ip] = ts


async def rate_limit(request: Request) -> None:
    ip = request.client.host if request.client else "unknown"
    _check_rate_limit(ip)


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@app.get("/api/health", response_model=HealthResponse, tags=["Health"])
async def health():
    return HealthResponse(
        status="healthy",
        service="deepfake-shield",
        version="1.0.0",
        timestamp=datetime.utcnow(),
    )


# ---------------------------------------------------------------------------
# Detection endpoints
# ---------------------------------------------------------------------------

def _validate_and_save(file: UploadFile, file_type: str):
    """Validate file type; raises 400 on failure."""
    if not file_service.validate_file(file, file_type):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid {file_type} file. Check MIME type and file size (<100 MB).",
        )


@app.post("/api/v1/detect/image", response_model=DetectionResponse, tags=["Detection"])
async def detect_image(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: None = Depends(rate_limit),
):
    """Upload an image file and receive a deepfake analysis result."""
    _validate_and_save(file, "image")
    request_id = str(uuid.uuid4())
    file_path = await file_service.save_file(file, request_id)
    from .models.schemas import FileType
    detection_service.create_record(request_id, file_path, FileType.IMAGE, db)
    background_tasks.add_task(detection_service.process_image, request_id, db)
    return DetectionResponse(
        request_id=request_id,
        status="processing",
        message="Image analysis started — poll /api/v1/results/{request_id} for the result.",
        created_at=datetime.utcnow(),
    )


@app.post("/api/v1/detect/video", response_model=DetectionResponse, tags=["Detection"])
async def detect_video(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: None = Depends(rate_limit),
):
    """Upload a video file and receive a deepfake analysis result."""
    _validate_and_save(file, "video")
    request_id = str(uuid.uuid4())
    file_path = await file_service.save_file(file, request_id)
    from .models.schemas import FileType
    detection_service.create_record(request_id, file_path, FileType.VIDEO, db)
    background_tasks.add_task(detection_service.process_video, request_id, db)
    return DetectionResponse(
        request_id=request_id,
        status="processing",
        message="Video analysis started — poll /api/v1/results/{request_id} for the result.",
        created_at=datetime.utcnow(),
    )


@app.post("/api/v1/detect/audio", response_model=DetectionResponse, tags=["Detection"])
async def detect_audio(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: None = Depends(rate_limit),
):
    """Upload an audio file and receive a voice-clone deepfake analysis result."""
    _validate_and_save(file, "audio")
    request_id = str(uuid.uuid4())
    file_path = await file_service.save_file(file, request_id)
    from .models.schemas import FileType
    detection_service.create_record(request_id, file_path, FileType.AUDIO, db)
    background_tasks.add_task(detection_service.process_audio, request_id, db)
    return DetectionResponse(
        request_id=request_id,
        status="processing",
        message="Audio analysis started — poll /api/v1/results/{request_id} for the result.",
        created_at=datetime.utcnow(),
    )


@app.get("/api/v1/results/{request_id}", response_model=DetectionResponse, tags=["Detection"])
async def get_result(request_id: str, db: Session = Depends(get_db)):
    """Poll for detection results by request ID."""
    result = detection_service.get_result(request_id, db)
    if not result:
        raise HTTPException(status_code=404, detail="Detection request not found")
    return result


# ---------------------------------------------------------------------------
# Analytics & recent
# ---------------------------------------------------------------------------

@app.get("/api/v1/analytics/summary", response_model=AnalyticsSummary, tags=["Analytics"])
async def analytics_summary(db: Session = Depends(get_db)):
    """Return aggregated detection statistics for the dashboard."""
    return detection_service.get_analytics(db)


@app.get("/api/v1/recent", response_model=List[RecentDetection], tags=["Analytics"])
async def recent_detections(db: Session = Depends(get_db), limit: int = 10):
    """Return the most recent detection requests."""
    return detection_service.get_recent(db, limit=min(limit, 50))


# ---------------------------------------------------------------------------
# Serve React frontend (production build inside /frontend/dist)
# ---------------------------------------------------------------------------

_FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")

if os.path.isdir(_FRONTEND_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(_FRONTEND_DIR, "assets")), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_frontend(full_path: str):
        index = os.path.join(_FRONTEND_DIR, "index.html")
        return FileResponse(index)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
