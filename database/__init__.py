from __future__ import annotations

"""
MongoDB connection manager using Motor (async driver).
Provides a singleton client and database reference.
"""

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from config import settings


class MongoDB:
    """Async MongoDB connection manager."""

    client: AsyncIOMotorClient | None = None
    db: AsyncIOMotorDatabase | None = None

    @classmethod
    async def connect(cls) -> None:
        """Establish connection to MongoDB."""
        cls.client = AsyncIOMotorClient(settings.mongodb_uri)
        cls.db = cls.client[settings.mongodb_db_name]

        # Verify connection
        await cls.client.admin.command("ping")
        print(f"[OK] Connected to MongoDB: {settings.mongodb_db_name}")

    @classmethod
    async def disconnect(cls) -> None:
        """Close the MongoDB connection."""
        if cls.client:
            cls.client.close()
            cls.client = None
            cls.db = None
            print("[INFO] Disconnected from MongoDB")

    @classmethod
    async def close(cls) -> None:
        """Idempotent alias for disconnect; safe to call repeatedly."""
        await cls.disconnect()

    @classmethod
    def get_db(cls) -> AsyncIOMotorDatabase:
        """Get the database instance."""
        if cls.db is None:
            raise RuntimeError("MongoDB is not connected. Call MongoDB.connect() first.")
        return cls.db


async def get_database() -> AsyncIOMotorDatabase:
    """FastAPI dependency to get the database."""
    return MongoDB.get_db()
