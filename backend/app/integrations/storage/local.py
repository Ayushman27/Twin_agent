"""Local filesystem storage implementation."""
import os

import aiofiles

from app.core.config import settings
from app.integrations.storage.interface import StorageInterface


class LocalStorageService(StorageInterface):
    def __init__(self):
        self.base_path = settings.STORAGE_LOCAL_PATH
        os.makedirs(self.base_path, exist_ok=True)

    async def save(self, file_bytes: bytes, path: str, content_type: str) -> str:
        full_path = os.path.join(self.base_path, path)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        async with aiofiles.open(full_path, "wb") as f:
            await f.write(file_bytes)
        return path

    async def delete(self, path: str) -> None:
        full_path = os.path.join(self.base_path, path)
        if os.path.exists(full_path):
            os.remove(full_path)

    def get_url(self, path: str) -> str:
        return f"/uploads/{path}"


def get_storage() -> StorageInterface:
    """Factory: returns correct storage backend based on STORAGE_PROVIDER."""
    provider = settings.STORAGE_PROVIDER
    if provider == "local":
        return LocalStorageService()
    # Future: elif provider == "s3": return S3StorageService()
    raise ValueError(f"Unknown storage provider: {provider}")
