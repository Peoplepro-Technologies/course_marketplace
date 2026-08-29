from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID


class WishlistRead(BaseModel):
    id: UUID
    course_id: UUID
    course_title: str
    course_thumbnail: Optional[str]
    course_category: Optional[str]
    instructor_name: str
    course_price: float
    added_at: datetime

    class Config:
        from_attributes = True
