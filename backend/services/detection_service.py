from datetime import datetime
from typing import Dict, List, Optional

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..models.detection import DetectionRecord
from ..models.schemas import (
    AnalyticsSummary,
    DetectionResponse,
    DetectionStatus,
    FileType,
    RecentDetection,
)
from .detection_engine import DeepfakeDetector
from .file_service import FileService
from ..utils.logger import get_logger

logger = get_logger(__name__)


class DetectionService:
    """Manages detection lifecycle: persist → process → update → clean up."""

    def __init__(self):
        self.detector = DeepfakeDetector()
        self.file_service = FileService()

    # ------------------------------------------------------------------
    # DB helpers
    # ------------------------------------------------------------------

    def create_record(self, request_id: str, file_path: str, file_type: FileType, db: Session) -> DetectionRecord:
        now = datetime.utcnow()
        record = DetectionRecord(
            request_id=request_id,
            file_path=file_path,
            file_type=file_type.value,
            status=DetectionStatus.PROCESSING.value,
            created_at=now,
            updated_at=now,
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        return record

    def _get_record(self, request_id: str, db: Session) -> Optional[DetectionRecord]:
        return db.execute(
            select(DetectionRecord).where(DetectionRecord.request_id == request_id)
        ).scalar_one_or_none()

    def _mark_failed(self, record: Optional[DetectionRecord], error: str, db: Session):
        if record:
            record.status = DetectionStatus.FAILED.value
            record.error_message = error
            record.updated_at = datetime.utcnow()
            try:
                db.commit()
            except Exception:
                db.rollback()

    def _apply_result(self, record: DetectionRecord, is_deepfake: bool, confidence: float,
                      label: str, regions: list, meta: dict, db: Session):
        record.is_deepfake = is_deepfake
        record.confidence = confidence
        record.confidence_label = label
        record.flagged_regions = regions
        record.status = DetectionStatus.COMPLETED.value
        record.processing_time = meta.get("processing_time", 0.0)
        record.extra_metadata = meta
        record.updated_at = datetime.utcnow()
        db.commit()

    # ------------------------------------------------------------------
    # Background tasks
    # ------------------------------------------------------------------

    async def process_video(self, request_id: str, db: Session) -> None:
        record = self._get_record(request_id, db)
        try:
            logger.info("Processing video", request_id=request_id)
            is_df, conf, label, regions, meta = await self.detector.detect_video(record.file_path)
            self._apply_result(record, is_df, conf, label, regions, meta, db)
        except Exception as e:
            logger.error("Video processing failed", request_id=request_id, error=str(e))
            self._mark_failed(record, str(e), db)
        finally:
            await self.file_service.cleanup_file(record.file_path)

    async def process_image(self, request_id: str, db: Session) -> None:
        record = self._get_record(request_id, db)
        try:
            logger.info("Processing image", request_id=request_id)
            is_df, conf, label, regions, meta = await self.detector.detect_image(record.file_path)
            self._apply_result(record, is_df, conf, label, regions, meta, db)
        except Exception as e:
            logger.error("Image processing failed", request_id=request_id, error=str(e))
            self._mark_failed(record, str(e), db)
        finally:
            await self.file_service.cleanup_file(record.file_path)

    async def process_audio(self, request_id: str, db: Session) -> None:
        record = self._get_record(request_id, db)
        try:
            logger.info("Processing audio", request_id=request_id)
            is_df, conf, label, regions, meta = await self.detector.detect_audio(record.file_path)
            self._apply_result(record, is_df, conf, label, regions, meta, db)
        except Exception as e:
            logger.error("Audio processing failed", request_id=request_id, error=str(e))
            self._mark_failed(record, str(e), db)
        finally:
            await self.file_service.cleanup_file(record.file_path)

    # ------------------------------------------------------------------
    # Query helpers
    # ------------------------------------------------------------------

    def get_result(self, request_id: str, db: Session) -> Optional[DetectionResponse]:
        record = self._get_record(request_id, db)
        if not record:
            return None
        return self._to_response(record)

    def get_recent(self, db: Session, limit: int = 10) -> List[RecentDetection]:
        rows = db.execute(
            select(DetectionRecord)
            .order_by(DetectionRecord.created_at.desc())
            .limit(limit)
        ).scalars().all()
        return [
            RecentDetection(
                request_id=r.request_id,
                file_type=r.file_type,
                confidence=r.confidence,
                confidence_label=r.confidence_label,
                is_deepfake=r.is_deepfake,
                status=r.status,
                created_at=r.created_at,
            )
            for r in rows
        ]

    def get_analytics(self, db: Session) -> AnalyticsSummary:
        total = db.scalar(select(func.count(DetectionRecord.id))) or 0
        successful = db.scalar(
            select(func.count()).where(DetectionRecord.status == DetectionStatus.COMPLETED.value)
        ) or 0
        failed = db.scalar(
            select(func.count()).where(DetectionRecord.status == DetectionStatus.FAILED.value)
        ) or 0
        avg_conf = float(db.scalar(select(func.avg(DetectionRecord.confidence))) or 0.0)
        deepfakes = db.scalar(
            select(func.count()).where(DetectionRecord.is_deepfake.is_(True))
        ) or 0
        authentic = db.scalar(
            select(func.count()).where(DetectionRecord.is_deepfake.is_(False))
        ) or 0
        avg_time = float(db.scalar(select(func.avg(DetectionRecord.processing_time))) or 0.0)
        by_type_rows = db.execute(
            select(DetectionRecord.file_type, func.count()).group_by(DetectionRecord.file_type)
        ).all()

        return AnalyticsSummary(
            total_detections=int(total),
            successful_detections=int(successful),
            failed_detections=int(failed),
            average_confidence=round(avg_conf, 4),
            deepfake_count=int(deepfakes),
            authentic_count=int(authentic),
            average_processing_time=round(avg_time, 2),
            detections_by_type={row[0]: int(row[1]) for row in by_type_rows},
        )

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    def _to_response(self, record: DetectionRecord) -> DetectionResponse:
        if record.status == DetectionStatus.COMPLETED.value:
            message = "Detection completed successfully"
        elif record.status == DetectionStatus.FAILED.value:
            message = record.error_message or "Detection failed"
        else:
            message = "Processing in progress…"

        return DetectionResponse(
            request_id=record.request_id,
            status=DetectionStatus(record.status),
            message=message,
            confidence=record.confidence,
            confidence_label=record.confidence_label,
            is_deepfake=record.is_deepfake,
            processing_time=record.processing_time,
            file_type=record.file_type,
            flagged_regions=record.flagged_regions,
            created_at=record.created_at,
            metadata=record.extra_metadata,
        )
