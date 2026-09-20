"""
models/platform_setting.py — Platform global settings model.
"""
from sqlalchemy import Column, String
from app.database import Base

class PlatformSetting(Base):
    __tablename__ = "platform_settings"
    
    key = Column(String(50), primary_key=True)
    value = Column(String(255), nullable=True)
