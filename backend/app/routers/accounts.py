"""
routers/accounts.py — Endpoints for accounts/finance role.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import Optional

from app.database import get_db
from app.auth.roles import require_role
from app.models.user import User
from app.models.transaction import Transaction
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.payout import InstructorPayout
from pydantic import BaseModel

class RejectRefundRequest(BaseModel):
    reason: Optional[str] = None
router = APIRouter(prefix="/api/v1/accounts", tags=["Accounts"])

@router.get("/transactions")
async def list_all_transactions(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(require_role("accounts")),
    db: Session = Depends(get_db),
):
    """
    Return all platform-wide transactions, paginated.
    """
    query = (
        db.query(Transaction)
        .options(
            joinedload(Transaction.course).joinedload(Course.instructor),
            joinedload(Transaction.learner)
        )
        .order_by(Transaction.created_at.desc())
    )

    total = query.count()
    transactions = query.offset(skip).limit(limit).all()

    items = []
    for t in transactions:
        items.append({
            "id": str(t.id),
            "learner_name": t.learner.name if t.learner else "Unknown Learner",
            "course_title": t.course.title if t.course else "Unknown Course",
            "instructor_name": t.course.instructor.name if t.course and t.course.instructor else "Unknown Instructor",
            "amount": t.amount,
            "status": t.status,
            "date": t.created_at.isoformat(),
        })

    return {
        "items": items,
        "total": total,
        "skip": skip,
        "limit": limit
    }

@router.get("/refunds/pending")
async def get_pending_refunds(
    current_user: User = Depends(require_role("accounts")),
    db: Session = Depends(get_db),
):
    query = (
        db.query(Transaction)
        .options(
            joinedload(Transaction.course).joinedload(Course.instructor),
            joinedload(Transaction.learner)
        )
        .filter(Transaction.refund_status == "requested")
        .order_by(Transaction.created_at.desc())
    )
    
    transactions = query.all()
    items = []
    for t in transactions:
        items.append({
            "id": str(t.id),
            "learner_name": t.learner.name if t.learner else "Unknown Learner",
            "course_title": t.course.title if t.course else "Unknown Course",
            "amount": t.amount,
            "refund_reason": t.refund_reason,
            "date": t.created_at.isoformat(),
        })
    return items

@router.put("/transactions/{transaction_id}/refund/approve")
async def approve_refund(
    transaction_id: str,
    current_user: User = Depends(require_role("accounts")),
    db: Session = Depends(get_db),
):
    transaction = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
        
    if transaction.refund_status != "requested":
        raise HTTPException(status_code=400, detail="Refund not requested")
        
    transaction.refund_status = "approved"
    transaction.status = "refunded"
    
    # Revoke enrollment access
    enrollment = db.query(Enrollment).filter(
        Enrollment.learner_id == transaction.learner_id,
        Enrollment.course_id == transaction.course_id
    ).first()
    if enrollment:
        enrollment.status = "revoked"
        
    db.commit()
    return {"message": "Refund approved and access revoked"}

@router.put("/transactions/{transaction_id}/refund/reject")
async def reject_refund(
    transaction_id: str,
    data: RejectRefundRequest,
    current_user: User = Depends(require_role("accounts")),
    db: Session = Depends(get_db),
):
    transaction = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
        
    if transaction.refund_status != "requested":
        raise HTTPException(status_code=400, detail="Refund not requested")
        
    transaction.refund_status = "rejected"
    db.commit()
    return {"message": "Refund rejected"}

from datetime import datetime

@router.post("/payouts/run")
async def run_payouts(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: User = Depends(require_role("accounts")),
    db: Session = Depends(get_db),
):
    query = (
        db.query(Transaction)
        .join(Course)
        .filter(
            Transaction.status == "completed",
            Transaction.refund_status == "none",
            Transaction.included_in_payout_id == None
        )
    )
    if start_date:
        query = query.filter(Transaction.created_at >= start_date)
    if end_date:
        query = query.filter(Transaction.created_at <= end_date)
        
    transactions = query.all()
    
    # Group by instructor
    instructor_payouts = {} # instructor_id -> list of transactions
    for t in transactions:
        instructor_id = t.course.instructor_id
        if instructor_id not in instructor_payouts:
            instructor_payouts[instructor_id] = []
        instructor_payouts[instructor_id].append(t)
        
    created_payouts = []
    
    for instructor_id, trans_list in instructor_payouts.items():
        total_amount = sum(t.amount for t in trans_list)
        if total_amount > 0:
            payout = InstructorPayout(
                instructor_id=instructor_id,
                period_start=start_date,
                period_end=end_date,
                total_amount=total_amount,
                status="pending"
            )
            db.add(payout)
            db.flush() # Get payout.id
            
            for t in trans_list:
                t.included_in_payout_id = payout.id
                
            created_payouts.append(payout)
            
    db.commit()
    return {"message": f"Created {len(created_payouts)} payouts", "payouts": len(created_payouts)}

@router.put("/payouts/{payout_id}/release")
async def release_payout(
    payout_id: str,
    current_user: User = Depends(require_role("accounts")),
    db: Session = Depends(get_db),
):
    payout = db.query(InstructorPayout).filter(InstructorPayout.id == payout_id).first()
    if not payout:
        raise HTTPException(status_code=404, detail="Payout not found")
        
    if payout.status != "pending":
        raise HTTPException(status_code=400, detail="Payout already processed")
        
    payout.status = "released"
    payout.released_at = datetime.now()
    db.commit()
    return {"message": "Payout released successfully"}

@router.get("/payouts")
async def list_payouts(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(require_role("accounts")),
    db: Session = Depends(get_db),
):
    query = db.query(InstructorPayout).options(joinedload(InstructorPayout.instructor)).order_by(InstructorPayout.created_at.desc())
    total = query.count()
    payouts = query.offset(skip).limit(limit).all()
    
    items = []
    for p in payouts:
        items.append({
            "id": str(p.id),
            "instructor_name": p.instructor.name if p.instructor else "Unknown",
            "period_start": p.period_start.isoformat() if p.period_start else None,
            "period_end": p.period_end.isoformat() if p.period_end else None,
            "total_amount": p.total_amount,
            "status": p.status,
            "created_at": p.created_at.isoformat(),
            "released_at": p.released_at.isoformat() if p.released_at else None,
        })
        
    return {
        "items": items,
        "total": total,
        "skip": skip,
        "limit": limit
    }
