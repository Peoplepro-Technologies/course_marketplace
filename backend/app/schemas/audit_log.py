from pydantic import BaseModel
from typing import Optional, Any, Dict
from datetime import datetime
from uuid import UUID


class AuditLogRead(BaseModel):
    id: UUID
    actor_user_id: Optional[UUID] = None
    action: str
    target_type: Optional[str] = None
    target_id: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    timestamp: datetime

    class Config:
        from_attributes = True
