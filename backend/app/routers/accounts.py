"""
<<<<<<< HEAD
routers/accounts.py — Endpoints for accounts/finance role.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import Optional
=======
routers/accounts.py — Endpoints for the Accounts role.

Provides:
  - Dashboard KPI metrics (estimated revenue, pending refunds, recent transactions)
  - Transaction listing  (approved enrollments as proxy transactions)
  - Refund request management (list, approve, reject)
  - Instructor payout summaries and "Mark as Paid"
  - Invoice listing (approved enrollments as invoices)
  - Financial report aggregates

NOTE: Revenue and payout figures are *estimated* (course price × approved
      enrollment count, 20% flat platform fee).  No real payment gateway is
      connected.  Transactions and Invoices are simplified views of enrollment
      data, not actual payment records.

All endpoints require the "accounts" Keycloak realm role.
"""

from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
>>>>>>> feature/subadmin-dashboard

from app.database import get_db
from app.auth.roles import require_role
from app.models.user import User
<<<<<<< HEAD
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
=======
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.refund_request import RefundRequest
from app.models.instructor_payout import InstructorPayout
from app.schemas.refund_request import RefundRequestRead, RefundRequestResolve
from app.schemas.instructor_payout import InstructorPayoutRead

router = APIRouter(prefix="/api/v1/accounts", tags=["Accounts"])

_PLATFORM_FEE_RATE = 0.20  # 20% flat placeholder fee


# ─────────────────────────────────────────────────────────────────────────────
# Dashboard KPIs
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/dashboard/kpis")
async def get_dashboard_kpis(
>>>>>>> feature/subadmin-dashboard
    current_user: User = Depends(require_role("accounts")),
    db: Session = Depends(get_db),
):
    """
<<<<<<< HEAD
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

@router.get("/reports/summary")
async def get_reports_summary(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: User = Depends(require_role("accounts")),
    db: Session = Depends(get_db),
):
    """
    Generate a financial summary report for the given date range.
    """
    # 1. Total Revenue (Transactions with status="completed")
    rev_query = db.query(Transaction).filter(Transaction.status == "completed")
    if start_date:
        rev_query = rev_query.filter(Transaction.created_at >= start_date)
    if end_date:
        rev_query = rev_query.filter(Transaction.created_at <= end_date)
    
    completed_txns = rev_query.all()
    total_revenue = sum(t.amount for t in completed_txns)
    transaction_count = len(completed_txns)
    
    # 2. Total Refunded (Transactions with refund_status="approved")
    ref_query = db.query(Transaction).filter(Transaction.refund_status == "approved")
    if start_date:
        ref_query = ref_query.filter(Transaction.created_at >= start_date)
    if end_date:
        ref_query = ref_query.filter(Transaction.created_at <= end_date)
        
    refunded_txns = ref_query.all()
    total_refunded = sum(t.amount for t in refunded_txns)
    refund_count = len(refunded_txns)
    
    # 3. Total Paid Out (InstructorPayouts with status in ["released", "settled"])
    pay_query = db.query(InstructorPayout).filter(InstructorPayout.status.in_(["released", "settled"]))
    if start_date:
        pay_query = pay_query.filter(InstructorPayout.created_at >= start_date)
    if end_date:
        pay_query = pay_query.filter(InstructorPayout.created_at <= end_date)
        
    payouts = pay_query.all()
    total_paid_out = sum(p.total_amount for p in payouts)
    
    # 4. Net Retained
    net_retained = total_revenue - total_refunded - total_paid_out
    
    return {
        "total_revenue": round(total_revenue, 2),
        "total_refunded": round(total_refunded, 2),
        "total_paid_out": round(total_paid_out, 2),
        "net_retained": round(net_retained, 2),
        "transaction_count": transaction_count,
        "refund_count": refund_count
=======
    KPI cards for the Accounts dashboard.

    Returns:
      - total_revenue: estimated sum of course prices for all approved enrollments
      - pending_refunds_count: number of refund requests with status "pending"
      - recent_transactions_count: approved enrollments in the last 30 days
    """
    # Estimated total revenue: sum of course.price for approved enrollments
    revenue_rows = (
        db.query(Course.price)
        .join(Enrollment, Enrollment.course_id == Course.id)
        .filter(Enrollment.status == "approved")
        .all()
    )
    total_revenue = sum(r.price for r in revenue_rows if r.price)

    # Pending refund requests
    pending_refunds = (
        db.query(func.count(RefundRequest.id))
        .filter(RefundRequest.status == "pending")
        .scalar()
    )

    # Recent transactions: approved enrollments in last 30 days
    from datetime import timedelta
    cutoff = datetime.now(timezone.utc) - timedelta(days=30)
    recent_transactions = (
        db.query(func.count(Enrollment.id))
        .filter(
            Enrollment.status == "approved",
            Enrollment.approved_at >= cutoff,
        )
        .scalar()
    )

    # Total approved enrollments
    total_approved = (
        db.query(func.count(Enrollment.id))
        .filter(Enrollment.status == "approved")
        .scalar()
    )

    return {
        "total_revenue": round(total_revenue, 2),
        "pending_refunds_count": pending_refunds,
        "recent_transactions_count": recent_transactions,
        "total_approved_enrollments": total_approved,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Transactions  (simplified: approved enrollments as proxy records)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/transactions")
async def list_transactions(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    current_user: User = Depends(require_role("accounts")),
    db: Session = Depends(get_db),
):
    """
    List all approved enrollments as simplified transaction records.
    ⚠️ This is a proxy view — no real payment gateway is connected.
    """
    query = (
        db.query(Enrollment, User, Course)
        .join(User, Enrollment.learner_id == User.id)
        .join(Course, Enrollment.course_id == Course.id)
        .filter(Enrollment.status == "approved")
        .order_by(Enrollment.approved_at.desc())
    )

    total = query.count()
    rows = query.offset((page - 1) * page_size).limit(page_size).all()

    transactions = [
        {
            "transaction_id": str(enrollment.id),
            "learner_name": learner.name,
            "learner_email": learner.email,
            "course_title": course.title,
            "amount": course.price,
            "date": enrollment.approved_at.isoformat() if enrollment.approved_at else enrollment.enrolled_at.isoformat(),
            "status": "completed",
            "enrollment_status": enrollment.status,
        }
        for enrollment, learner, course in rows
    ]

    return {
        "transactions": transactions,
        "total": total,
        "page": page,
        "page_size": page_size,
        "note": "Simplified view based on enrollment data — pending real payment integration.",
    }


# ─────────────────────────────────────────────────────────────────────────────
# Refund Requests
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/refunds")
async def list_refund_requests(
    status: Optional[str] = Query(None, description="Filter by status: pending, approved, rejected"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    current_user: User = Depends(require_role("accounts")),
    db: Session = Depends(get_db),
):
    """List all refund requests, optionally filtered by status."""
    query = (
        db.query(RefundRequest, User.name, User.email, Course.title, Course.price)
        .join(User, RefundRequest.learner_id == User.id)
        .join(Enrollment, RefundRequest.enrollment_id == Enrollment.id)
        .join(Course, Enrollment.course_id == Course.id)
    )

    if status:
        query = query.filter(RefundRequest.status == status)

    total = query.count()
    rows = (
        query.order_by(RefundRequest.requested_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    refunds = []
    for rr, learner_name, learner_email, course_title, course_price in rows:
        data = RefundRequestRead.model_validate(rr)
        data.learner_name = learner_name
        data.course_title = course_title
        data.course_price = course_price
        refunds.append(data)

    return {
        "refunds": refunds,
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.put("/refunds/{refund_id}/approve")
async def approve_refund(
    refund_id: str,
    body: RefundRequestResolve = RefundRequestResolve(),
    current_user: User = Depends(require_role("accounts")),
    db: Session = Depends(get_db),
):
    """
    Approve a pending refund request.
    Sets refund status to "approved" and enrollment status to "refunded",
    which revokes the learner's video access (since only "approved" grants access).
    """
    rr = db.query(RefundRequest).filter(RefundRequest.id == refund_id).first()
    if not rr:
        raise HTTPException(status_code=404, detail="Refund request not found")
    if rr.status != "pending":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot approve a refund with status '{rr.status}'",
        )

    # Update refund request
    rr.status = "approved"
    rr.resolved_at = datetime.now(timezone.utc)
    rr.resolved_by = current_user.id

    # Revoke enrollment access
    enrollment = db.query(Enrollment).filter(Enrollment.id == rr.enrollment_id).first()
    if enrollment:
        enrollment.status = "refunded"

    db.commit()

    return {
        "message": "Refund approved and enrollment access revoked",
        "refund_id": str(rr.id),
        "enrollment_status": "refunded",
    }


@router.put("/refunds/{refund_id}/reject")
async def reject_refund(
    refund_id: str,
    body: RefundRequestResolve = RefundRequestResolve(),
    current_user: User = Depends(require_role("accounts")),
    db: Session = Depends(get_db),
):
    """
    Reject a pending refund request.
    The enrollment status remains unchanged (learner keeps access).
    """
    rr = db.query(RefundRequest).filter(RefundRequest.id == refund_id).first()
    if not rr:
        raise HTTPException(status_code=404, detail="Refund request not found")
    if rr.status != "pending":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot reject a refund with status '{rr.status}'",
        )

    rr.status = "rejected"
    rr.resolved_at = datetime.now(timezone.utc)
    rr.resolved_by = current_user.id
    db.commit()

    return {
        "message": "Refund request rejected",
        "refund_id": str(rr.id),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Instructor Payouts
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/payouts")
async def list_instructor_payouts(
    current_user: User = Depends(require_role("accounts")),
    db: Session = Depends(get_db),
):
    """
    Per-instructor earnings summary.
    Gross = sum of course.price for all approved enrollments per instructor.
    Platform fee = 20% flat (placeholder).
    Net = gross * 0.80.
    ⚠️ These are estimated figures — no real payment system is connected.
    """
    # Get all instructors who have at least one approved enrollment
    instructors = (
        db.query(User)
        .filter(User.role == "instructor")
        .all()
    )

    result = []
    for instructor in instructors:
        # Sum approved enrollment prices for this instructor's courses
        rows = (
            db.query(Course.price)
            .join(Enrollment, Enrollment.course_id == Course.id)
            .filter(
                Course.instructor_id == instructor.id,
                Enrollment.status == "approved",
            )
            .all()
        )
        gross = sum(r.price for r in rows if r.price)
        if gross == 0:
            continue  # Skip instructors with no approved enrollments

        fee = round(gross * _PLATFORM_FEE_RATE, 2)
        net = round(gross - fee, 2)
        gross = round(gross, 2)

        # Count courses and approved enrollments
        course_count = db.query(func.count(Course.id)).filter(
            Course.instructor_id == instructor.id
        ).scalar()
        enrollment_count = len(rows)

        # Get the most recent payout for this instructor
        last_payout = (
            db.query(InstructorPayout)
            .filter(InstructorPayout.instructor_id == instructor.id)
            .order_by(InstructorPayout.marked_paid_at.desc())
            .first()
        )

        result.append({
            "instructor_id": str(instructor.id),
            "instructor_name": instructor.name,
            "instructor_email": instructor.email,
            "course_count": course_count,
            "approved_enrollments": enrollment_count,
            "gross_earnings": gross,
            "platform_fee": fee,
            "net_payout": net,
            "last_paid_at": last_payout.marked_paid_at.isoformat() if last_payout else None,
            "last_payout_id": str(last_payout.id) if last_payout else None,
        })

    # Sort by gross earnings descending
    result.sort(key=lambda x: x["gross_earnings"], reverse=True)

    return {
        "payouts": result,
        "platform_fee_rate": _PLATFORM_FEE_RATE,
        "note": "Estimated figures based on enrollment data. Flat 20% platform fee. No real payment processed.",
    }


@router.post("/payouts/{instructor_id}/mark-paid")
async def mark_instructor_paid(
    instructor_id: str,
    current_user: User = Depends(require_role("accounts")),
    db: Session = Depends(get_db),
):
    """
    Record a payout for an instructor.
    Creates an InstructorPayout row with current earnings snapshot and timestamp.
    No real payment is processed.
    """
    instructor = db.query(User).filter(
        User.id == instructor_id,
        User.role == "instructor",
    ).first()
    if not instructor:
        raise HTTPException(status_code=404, detail="Instructor not found")

    # Calculate current earnings
    rows = (
        db.query(Course.price)
        .join(Enrollment, Enrollment.course_id == Course.id)
        .filter(
            Course.instructor_id == instructor_id,
            Enrollment.status == "approved",
        )
        .all()
    )
    gross = round(sum(r.price for r in rows if r.price), 2)
    fee = round(gross * _PLATFORM_FEE_RATE, 2)
    net = round(gross - fee, 2)

    now = datetime.now(timezone.utc)
    period_label = now.strftime("%b %Y")

    payout = InstructorPayout(
        instructor_id=instructor_id,
        period_label=period_label,
        gross_earnings=gross,
        platform_fee=fee,
        net_payout=net,
        marked_paid_at=now,
        marked_paid_by=current_user.id,
    )
    db.add(payout)
    db.commit()
    db.refresh(payout)

    return {
        "message": f"Payout recorded for {instructor.name}",
        "payout_id": str(payout.id),
        "net_payout": net,
        "marked_paid_at": payout.marked_paid_at.isoformat(),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Invoices  (simplified: approved enrollments as invoice records)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/invoices")
async def list_invoices(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    current_user: User = Depends(require_role("accounts")),
    db: Session = Depends(get_db),
):
    """
    List approved enrollments as simplified invoice records.
    ⚠️ Simplified view — no PDF generation, no real invoice system.
    """
    query = (
        db.query(Enrollment, User, Course)
        .join(User, Enrollment.learner_id == User.id)
        .join(Course, Enrollment.course_id == Course.id)
        .filter(Enrollment.status == "approved")
        .order_by(Enrollment.approved_at.desc())
    )

    total = query.count()
    rows = query.offset((page - 1) * page_size).limit(page_size).all()

    invoices = [
        {
            "invoice_id": f"INV-{str(enrollment.id)[:8].upper()}",
            "enrollment_id": str(enrollment.id),
            "learner_name": learner.name,
            "learner_email": learner.email,
            "course_title": course.title,
            "amount": course.price,
            "invoice_date": enrollment.approved_at.isoformat() if enrollment.approved_at else enrollment.enrolled_at.isoformat(),
            "status": "paid",
        }
        for enrollment, learner, course in rows
    ]

    return {
        "invoices": invoices,
        "total": total,
        "page": page,
        "page_size": page_size,
        "note": "Simplified view — no real invoice system or PDF generation.",
    }


# ─────────────────────────────────────────────────────────────────────────────
# Financial Reports
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/financial-reports")
async def get_financial_reports(
    current_user: User = Depends(require_role("accounts")),
    db: Session = Depends(get_db),
):
    """
    Aggregate financial numbers.

    Revenue = estimated (course price × approved enrollments).
    Payouts = sum of InstructorPayout.net_payout records.
    """
    from datetime import timedelta

    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    year_start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)

    # All-time revenue (estimated)
    all_time_rows = (
        db.query(Course.price)
        .join(Enrollment, Enrollment.course_id == Course.id)
        .filter(Enrollment.status == "approved")
        .all()
    )
    total_revenue_all_time = round(sum(r.price for r in all_time_rows if r.price), 2)

    # Monthly revenue (approved enrollments this month)
    monthly_rows = (
        db.query(Course.price)
        .join(Enrollment, Enrollment.course_id == Course.id)
        .filter(
            Enrollment.status == "approved",
            Enrollment.approved_at >= month_start,
        )
        .all()
    )
    total_revenue_this_month = round(sum(r.price for r in monthly_rows if r.price), 2)

    # Year-to-date revenue
    ytd_rows = (
        db.query(Course.price)
        .join(Enrollment, Enrollment.course_id == Course.id)
        .filter(
            Enrollment.status == "approved",
            Enrollment.approved_at >= year_start,
        )
        .all()
    )
    total_revenue_ytd = round(sum(r.price for r in ytd_rows if r.price), 2)

    # Total payouts issued (net sums from InstructorPayout records)
    payout_sum = db.query(func.sum(InstructorPayout.net_payout)).scalar() or 0.0
    payout_count = db.query(func.count(InstructorPayout.id)).scalar()

    # Pending refunds
    pending_refunds = (
        db.query(func.count(RefundRequest.id))
        .filter(RefundRequest.status == "pending")
        .scalar()
    )
    approved_refunds = (
        db.query(func.count(RefundRequest.id))
        .filter(RefundRequest.status == "approved")
        .scalar()
    )

    # Total enrollments breakdown
    total_approved = (
        db.query(func.count(Enrollment.id))
        .filter(Enrollment.status == "approved")
        .scalar()
    )
    total_refunded = (
        db.query(func.count(Enrollment.id))
        .filter(Enrollment.status == "refunded")
        .scalar()
    )

    return {
        "revenue": {
            "all_time": total_revenue_all_time,
            "this_month": total_revenue_this_month,
            "year_to_date": total_revenue_ytd,
        },
        "payouts": {
            "total_issued": round(payout_sum, 2),
            "payout_events": payout_count,
        },
        "refunds": {
            "pending": pending_refunds,
            "approved_all_time": approved_refunds,
        },
        "enrollments": {
            "total_approved": total_approved,
            "total_refunded": total_refunded,
        },
        "note": "Revenue figures are estimated (course price × approved enrollments). No real payment gateway connected.",
        "generated_at": now.isoformat(),
>>>>>>> feature/subadmin-dashboard
    }
