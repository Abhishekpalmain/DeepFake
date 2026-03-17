import os
from typing import Optional

import aiofiles
from fastapi import UploadFile

from ..core.config import settings
from ..utils.logger import get_logger

logger = get_logger(__name__)

_CHUNK_SIZE = 64 * 1024  # 64 KB chunks to avoid loading large files into RAM


class FileService:
    """Handles file upload, validation, and cleanup."""

    def __init__(self):
        self.upload_dir = os.environ.get("UPLOAD_DIR", "uploads")
        os.makedirs(self.upload_dir, exist_ok=True)

    async def save_file(self, file: UploadFile, request_id: str) -> str:
        """Stream file to disk in chunks to prevent OOM on large uploads."""
        ext = os.path.splitext(file.filename or "upload")[1] or ".bin"
        filename = f"{request_id}{ext}"
        path = os.path.join(self.upload_dir, filename)

        try:
            async with aiofiles.open(path, "wb") as out:
                while chunk := await file.read(_CHUNK_SIZE):
                    await out.write(chunk)
            logger.info("File saved", request_id=request_id, path=path)
            return path
        except Exception as e:
            logger.error("File save failed", request_id=request_id, error=str(e))
            raise

    def validate_file(self, file: UploadFile, file_type: str) -> bool:
        """Validate MIME type and (best-effort) size."""
        content_type = (file.content_type or "").lower()

        allowed = {
            "video": settings.ALLOWED_VIDEO_TYPES,
            "image": settings.ALLOWED_IMAGE_TYPES,
            "audio": settings.ALLOWED_AUDIO_TYPES,
        }.get(file_type)

        if allowed is None or content_type not in allowed:
            return False

        # Best-effort size check (not always available via streaming)
        try:
            file.file.seek(0, 2)
            size = file.file.tell()
            file.file.seek(0)
            if size and size > settings.MAX_FILE_SIZE:
                return False
        except Exception:
            pass

        return True

    async def cleanup_file(self, file_path: str) -> bool:
        """Delete the uploaded file after processing."""
        try:
            if file_path and os.path.exists(file_path):
                os.remove(file_path)
                return True
        except Exception as e:
            logger.warning("File cleanup failed", path=file_path, error=str(e))
        return False
