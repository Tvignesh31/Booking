from pathlib import Path
from fastapi import APIRouter, UploadFile, File, HTTPException, status
from fastapi.responses import FileResponse
from app.services.cloudflare_storage import storage_service
from app.core.config import settings

router = APIRouter(prefix="/media", tags=["media"])

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"}
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"}
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100 MB max for videos, images usually < 10MB

@router.post("/upload")
async def upload_media_file(
    file: UploadFile = File(...)
):
    """
    Upload an image or video to Cloudflare R2 / Cloudflare Images
    (with local filesystem fallback for offline development).
    """
    content_type = file.content_type or "application/octet-stream"
    if content_type not in ALLOWED_IMAGE_TYPES and content_type not in ALLOWED_VIDEO_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type '{content_type}'. Allowed types: JPEG, PNG, WebP, AVIF, MP4, WebM."
        )

    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File size exceeds maximum allowed limit of 100 MB."
        )

    result = await storage_service.upload_file(
        file_bytes=file_bytes,
        original_filename=file.filename or "upload",
        content_type=content_type
    )

    return {
        "success": True,
        **result
    }

@router.get("/status")
async def get_storage_status():
    """
    Check Cloudflare R2 / Cloudflare Images connection and active storage provider.
    """
    return storage_service.get_status()

@router.get("/files/{filename}")
async def serve_local_media_file(filename: str):
    """
    Serves uploaded media files when running with local storage fallback.
    """
    file_path = Path(settings.LOCAL_UPLOAD_DIR) / filename
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="File not found.")
    return FileResponse(file_path)
