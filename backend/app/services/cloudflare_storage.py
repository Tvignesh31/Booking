"""
Cloudflare Storage Service for HavenStay.
Supports:
1. Cloudflare R2 (S3-compatible Object Storage for images and videos)
2. Cloudflare Images API
3. Zero-config local filesystem fallback for development.
"""

import os
import uuid
import logging
import asyncio
from pathlib import Path
from typing import Optional, Dict, Any, Tuple

import httpx
from app.core.config import settings

logger = logging.getLogger("cloudflare_storage")
logger.setLevel(logging.INFO)

class CloudflareStorageService:
    def __init__(self):
        self.account_id = settings.CLOUDFLARE_ACCOUNT_ID
        self.r2_access_key = settings.CLOUDFLARE_R2_ACCESS_KEY
        self.r2_secret_key = settings.CLOUDFLARE_R2_SECRET_KEY
        self.r2_bucket = settings.CLOUDFLARE_R2_BUCKET
        self.r2_public_url = settings.CLOUDFLARE_R2_PUBLIC_URL
        self.images_token = settings.CLOUDFLARE_IMAGES_API_TOKEN
        self.images_hash = settings.CLOUDFLARE_IMAGES_ACCOUNT_HASH

        # Local directory fallback
        self.local_dir = Path(settings.LOCAL_UPLOAD_DIR)
        self.local_dir.mkdir(parents=True, exist_ok=True)

    def is_r2_configured(self) -> bool:
        return bool(
            self.account_id
            and self.r2_access_key
            and self.r2_secret_key
            and self.r2_bucket
        )

    def is_images_configured(self) -> bool:
        return bool(self.account_id and self.images_token)

    def _sync_upload_to_r2(self, file_bytes: bytes, filename: str, content_type: str) -> str:
        import boto3
        from botocore.config import Config

        endpoint = f"https://{self.account_id}.r2.cloudflarestorage.com"
        s3 = boto3.client(
            "s3",
            endpoint_url=endpoint,
            aws_access_key_id=self.r2_access_key,
            aws_secret_access_key=self.r2_secret_key,
            region_name="auto",
            config=Config(signature_version="s3v4")
        )

        s3.put_object(
            Bucket=self.r2_bucket,
            Key=filename,
            Body=file_bytes,
            ContentType=content_type
        )

        if self.r2_public_url:
            base = self.r2_public_url.rstrip("/")
            return f"{base}/{filename}"
        return f"{endpoint}/{self.r2_bucket}/{filename}"

    async def upload_image_cloudflare_images(self, file_bytes: bytes, filename: str) -> Optional[str]:
        """Upload via Cloudflare Images API"""
        if not self.is_images_configured():
            return None

        url = f"https://api.cloudflare.com/client/v4/accounts/{self.account_id}/images/v1"
        headers = {"Authorization": f"Bearer {self.images_token}"}
        files = {"file": (filename, file_bytes)}

        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.post(url, headers=headers, files=files)
            if res.status_code == 200:
                data = res.json()
                variants = data.get("result", {}).get("variants", [])
                if variants:
                    return variants[0]
                img_id = data.get("result", {}).get("id")
                if img_id and self.images_hash:
                    return f"https://imagedelivery.net/{self.images_hash}/{img_id}/public"
            logger.warning(f"Cloudflare Images API error: {res.text}")
        return None

    async def upload_file(
        self,
        file_bytes: bytes,
        original_filename: str,
        content_type: str
    ) -> Dict[str, Any]:
        """
        Uploads image or video to Cloudflare R2 or Cloudflare Images.
        If Cloudflare credentials are not provided, stores safely in local upload directory.
        """
        ext = os.path.splitext(original_filename)[1].lower()
        if not ext:
            ext = ".jpg" if "image" in content_type else ".mp4"

        unique_name = f"{uuid.uuid4().hex[:16]}{ext}"
        is_video = "video" in content_type or ext in [".mp4", ".webm", ".mov", ".avi"]

        # 1. Try Cloudflare Images (only for images)
        if not is_video and self.is_images_configured():
            cf_url = await self.upload_image_cloudflare_images(file_bytes, unique_name)
            if cf_url:
                logger.info(f"Uploaded to Cloudflare Images: {cf_url}")
                return {
                    "url": cf_url,
                    "filename": unique_name,
                    "provider": "cloudflare_images",
                    "content_type": content_type,
                    "size_bytes": len(file_bytes),
                    "is_video": False
                }

        # 2. Try Cloudflare R2 (for both images and videos)
        if self.is_r2_configured():
            try:
                public_url = await asyncio.to_thread(
                    self._sync_upload_to_r2,
                    file_bytes,
                    unique_name,
                    content_type
                )
                logger.info(f"Uploaded to Cloudflare R2 ({'video' if is_video else 'image'}): {public_url}")
                return {
                    "url": public_url,
                    "filename": unique_name,
                    "provider": "cloudflare_r2",
                    "content_type": content_type,
                    "size_bytes": len(file_bytes),
                    "is_video": is_video
                }
            except Exception as e:
                logger.error(f"Cloudflare R2 upload failed, falling back to local: {e}")

        # 3. Local filesystem fallback
        local_path = self.local_dir / unique_name
        with open(local_path, "wb") as f:
            f.write(file_bytes)

        local_url = f"/api/v1/media/files/{unique_name}"
        logger.info(f"Stored file locally ({unique_name}): {local_url}")

        return {
            "url": local_url,
            "filename": unique_name,
            "provider": "local_storage",
            "content_type": content_type,
            "size_bytes": len(file_bytes),
            "is_video": is_video
        }

    def get_status(self) -> Dict[str, Any]:
        return {
            "r2_configured": self.is_r2_configured(),
            "r2_bucket": self.r2_bucket if self.is_r2_configured() else None,
            "cloudflare_images_configured": self.is_images_configured(),
            "active_provider": "cloudflare_r2" if self.is_r2_configured() else ("cloudflare_images" if self.is_images_configured() else "local_storage"),
            "local_storage_dir": str(self.local_dir)
        }

storage_service = CloudflareStorageService()
