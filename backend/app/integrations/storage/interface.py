"""Storage abstraction interface."""
from abc import ABC, abstractmethod


class StorageInterface(ABC):
    @abstractmethod
    async def save(self, file_bytes: bytes, path: str, content_type: str) -> str:
        """Save file and return the storage path."""

    @abstractmethod
    async def delete(self, path: str) -> None:
        """Delete a file by path."""

    @abstractmethod
    def get_url(self, path: str) -> str:
        """Return a URL or local path to access the file."""
