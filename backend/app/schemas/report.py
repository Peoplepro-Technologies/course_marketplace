from pydantic import BaseModel
from typing import List
from uuid import UUID

class CourseReport(BaseModel):
    course_id: UUID
    title: str
    instructor_name: str
    enrollments_count: int
    avg_rating: float
    completion_rate: float

class ReportResponse(BaseModel):
    reports: List[CourseReport]
    total: int
    page: int
    page_size: int
