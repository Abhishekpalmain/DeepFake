import os
import time
from typing import Tuple, Dict, Any, List

import cv2
import numpy as np

from ..core.config import settings
from ..utils.logger import get_logger

logger = get_logger(__name__)

# Optional TensorFlow import — not required; we fall back to rule-based
try:
    import tensorflow as tf
    _TF_AVAILABLE = True
except ImportError:
    _TF_AVAILABLE = False


def _label(confidence: float) -> str:
    """Map confidence score to human-readable label."""
    if confidence >= 0.70:
        return "fake"
    elif confidence >= 0.40:
        return "uncertain"
    return "authentic"


class DeepfakeDetector:
    """Main deepfake detection engine (ML model + rule-based fallback)."""

    def __init__(self) -> None:
        self.video_model = None
        self.image_model = None
        self._load_models()

    def _load_models(self) -> None:
        if not _TF_AVAILABLE:
            logger.info("TensorFlow not available — using rule-based detection only")
            return

        video_path = os.path.join(settings.MODEL_PATH, settings.VIDEO_MODEL_FILE)
        image_path = os.path.join(settings.MODEL_PATH, settings.IMAGE_MODEL_FILE)

        if os.path.exists(video_path):
            try:
                self.video_model = tf.keras.models.load_model(video_path)
                logger.info("Video model loaded", path=video_path)
            except Exception as e:
                logger.error("Video model load failed", error=str(e))

        if os.path.exists(image_path):
            try:
                self.image_model = tf.keras.models.load_model(image_path)
                logger.info("Image model loaded", path=image_path)
            except Exception as e:
                logger.error("Image model load failed", error=str(e))

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def detect_video(self, video_path: str) -> Tuple[bool, float, str, List[Dict], Dict]:
        start = time.time()
        try:
            frames = self._extract_frames(video_path, max_frames=30)
            if not frames:
                raise ValueError("Could not extract any frames from video")

            if self.video_model:
                confidence, regions = self._model_video(frames)
            else:
                confidence, regions = self._rules_video(frames)

            label = _label(confidence)
            is_deepfake = confidence >= 0.70
            meta = {
                "frames_analyzed": len(frames),
                "method": "model" if self.video_model else "rules",
                "processing_time": round(time.time() - start, 2),
            }
            return is_deepfake, round(confidence, 4), label, regions, meta

        except Exception as e:
            logger.error("Video detection error", error=str(e))
            raise RuntimeError(f"Video detection failed: {e}") from e

    def detect_image(self, image_path: str) -> Tuple[bool, float, str, List[Dict], Dict]:
        start = time.time()
        try:
            img = cv2.imread(image_path)
            if img is None:
                raise ValueError("Could not load image file")

            if self.image_model:
                confidence, regions = self._model_image(img)
            else:
                confidence, regions = self._rules_image(img)

            label = _label(confidence)
            is_deepfake = confidence >= 0.70
            meta = {
                "method": "model" if self.image_model else "rules",
                "image_shape": list(img.shape),
                "processing_time": round(time.time() - start, 2),
            }
            return is_deepfake, round(confidence, 4), label, regions, meta

        except Exception as e:
            logger.error("Image detection error", error=str(e))
            raise RuntimeError(f"Image detection failed: {e}") from e

    def detect_audio(self, audio_path: str) -> Tuple[bool, float, str, List[Dict], Dict]:
        """
        Audio deepfake detection via librosa spectrogram heuristics.
        Returns (is_deepfake, confidence, label, regions, metadata).
        'regions' is empty for audio — flagging is done via metadata instead.
        """
        start = time.time()
        try:
            import librosa
            y, sr = librosa.load(audio_path, sr=None, mono=True, duration=30.0)

            # Feature 1: MFCC irregularity
            mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
            mfcc_std = float(np.std(mfcc))

            # Feature 2: Spectral flatness (synthetic voices tend to be flatter)
            flatness = float(np.mean(librosa.feature.spectral_flatness(y=y)))

            # Feature 3: Zero-crossing rate (cloning artifacts)
            zcr = float(np.mean(librosa.feature.zero_crossing_rate(y)))

            # Heuristic scoring
            score = 0.0
            if mfcc_std < 18:
                score += 0.30  # suspiciously flat MFCCs
            if flatness > 0.015:
                score += 0.25  # too spectrally flat
            if zcr > 0.12:
                score += 0.20  # high ZCR can indicate artifacts
            score = min(score + 0.10, 1.0)  # baseline presence

            label = _label(score)
            is_deepfake = score >= 0.70
            meta = {
                "method": "spectrogram_heuristic",
                "sample_rate": sr,
                "duration_seconds": round(len(y) / sr, 2),
                "mfcc_std": round(mfcc_std, 4),
                "spectral_flatness": round(flatness, 6),
                "zero_crossing_rate": round(zcr, 6),
                "processing_time": round(time.time() - start, 2),
            }
            return is_deepfake, round(score, 4), label, [], meta

        except ImportError:
            raise RuntimeError("librosa is not installed — cannot process audio")
        except Exception as e:
            logger.error("Audio detection error", error=str(e))
            raise RuntimeError(f"Audio detection failed: {e}") from e

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _extract_frames(self, path: str, max_frames: int = 30) -> List[np.ndarray]:
        frames = []
        cap = cv2.VideoCapture(path)
        try:
            total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 1
            step = max(1, total // max_frames)
            idx = 0
            while cap.isOpened() and len(frames) < max_frames:
                cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
                ret, frame = cap.read()
                if not ret:
                    break
                frames.append(frame)
                idx += step
        finally:
            cap.release()
        return frames

    # --- Model-based

    def _model_video(self, frames: List[np.ndarray]) -> Tuple[float, List[Dict]]:
        processed = [cv2.resize(f, (224, 224)) / 255.0 for f in frames]
        arr = np.array(processed)
        preds = self.video_model.predict(arr, verbose=0)
        confidence = float(np.mean(preds))
        regions = self._detect_face_regions(frames[0]) if frames else []
        return confidence, regions

    def _model_image(self, img: np.ndarray) -> Tuple[float, List[Dict]]:
        resized = cv2.resize(img, (224, 224)) / 255.0
        arr = np.expand_dims(resized, axis=0)
        pred = float(self.image_model.predict(arr, verbose=0)[0])
        return pred, self._detect_face_regions(img)

    # --- Rule-based

    def _rules_video(self, frames: List[np.ndarray]) -> Tuple[float, List[Dict]]:
        scores = [self._score_frame(f) for f in frames]
        confidence = float(np.mean(scores))
        regions = self._detect_face_regions(frames[0]) if frames else []
        return confidence, regions

    def _rules_image(self, img: np.ndarray) -> Tuple[float, List[Dict]]:
        confidence = self._score_frame(img)
        return confidence, self._detect_face_regions(img)

    def _score_frame(self, frame: np.ndarray) -> float:
        score = 0.0
        try:
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

            edges = cv2.Canny(gray, 100, 200)
            edge_density = float(np.sum(edges > 0)) / edges.size
            if edge_density > 0.15:
                score += 0.20

            hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
            sat_std = float(np.std(hsv[:, :, 1]))
            if sat_std > 50:
                score += 0.15

            denoised = cv2.fastNlMeansDenoisingColored(frame, None, 10, 10, 7, 21)
            noise = float(np.mean(cv2.absdiff(frame, denoised)))
            if noise > 10:
                score += 0.10

            laplacian_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
            if laplacian_var < 50:
                score += 0.15  # blurring artifact common in deepfakes

        except Exception as e:
            logger.warning("Frame scoring error", error=str(e))

        return min(score, 1.0)

    def _detect_face_regions(self, frame: np.ndarray) -> List[Dict[str, Any]]:
        """Detect faces using OpenCV Haar cascade and return bounding boxes."""
        regions: List[Dict] = []
        try:
            cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
            if not os.path.exists(cascade_path):
                return regions

            cascade = cv2.CascadeClassifier(cascade_path)
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            faces = cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))

            h, w = frame.shape[:2]
            for (fx, fy, fw, fh) in faces:
                regions.append({
                    "x": round(float(fx) / w, 4),
                    "y": round(float(fy) / h, 4),
                    "width": round(float(fw) / w, 4),
                    "height": round(float(fh) / h, 4),
                    "label": "face",
                })
        except Exception as e:
            logger.warning("Face detection error", error=str(e))
        return regions
