from sqlalchemy.orm import Session
from typing import Optional, Dict, Any
from uuid import UUID

from app.models.audit_log import AuditLog

def record_audit_log(
    db: Session,
    actor_id: Optional[UUID],
    action: str,
    target_type: Optional[str] = None,
    target_id: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
):
    """
    Record an action in the audit log.
    Does not call db.commit() to allow callers to commit it
    along with their business logic in a single transaction.
    """
    log_entry = AuditLog(
        actor_id=actor_id,
        action=action,
        target_type=target_type,
        target_id=target_id,
        details=details or {}
    )
    db.add(log_entry)
