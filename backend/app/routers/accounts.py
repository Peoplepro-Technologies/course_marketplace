"""
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

from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.auth.roles import require_role
from app.models.user import User
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.refund_request import RefundRequest
from app.models.instructor_payout import InstructorPayout
from app.models.transaction import Transaction
from app.schemas.refund_request import RefundRequestRead, RefundRequestResolve

router = APIRouter(prefix="/api/v1/accounts", tags=["Accounts"])

_PLATFORM_FEE_RATE = 0.20  # 20% flat placeholder fee


# ─────────────────────────────────────────────────────────────────────────────
# Dashboard KPIs
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/dashboard/kpis")
async def get_dashboard_kpis(
    current_user: User = Depends(require_role("accounts")),
    db: Session = Depends(get_db),
):
    """
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
    total_revenue = sum(r[0] if isinstance(r, (tuple, list)) else getattr(r, 'price', 0.0) for r in revenue_rows if (r[0] if isinstance(r, (tuple, list)) else getattr(r, 'price', None)))

    # Pending refund requests
    pending_refunds = (
        db.query(func.count(RefundRequest.id))
        .filter(RefundRequest.status == "pending")
        .scalar() or 0
    )

    # Recent transactions: approved enrollments in last 30 days
    cutoff = datetime.now(timezone.utc) - timedelta(days=30)
    recent_transactions = (
        db.query(func.count(Enrollment.id))
        .filter(
            Enrollment.status == "approved",
            func.coalesce(Enrollment.approved_at, Enrollment.enrolled_at) >= cutoff,
        )
        .scalar() or 0
    )

    # Total approved enrollments
    total_approved = (
        db.query(func.count(Enrollment.id))
        .filter(Enrollment.status == "approved")
        .scalar() or 0
    )

    return {
        "total_revenue": round(float(total_revenue), 2),
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
        .order_by(func.coalesce(Enrollment.approved_at, Enrollment.enrolled_at).desc())
    )

    total = query.count()
    rows = query.offset((page - 1) * page_size).limit(page_size).all()

    transactions = []
    for enrollment, learner, course in rows:
        event_date = enrollment.approved_at or enrollment.enrolled_at or datetime.now(timezone.utc)
        transactions.append({
            "transaction_id": str(enrollment.id),
            "learner_name": learner.name,
            "learner_email": learner.email,
            "course_title": course.title,
            "amount": course.price,
            "date": event_date.isoformat(),
            "status": "completed",
            "enrollment_status": enrollment.status,
        })

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
    body: Optional[RefundRequestResolve] = Body(default=None),
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
        
        # Sync Transaction table if transaction exists
        tx = db.query(Transaction).filter(
            Transaction.learner_id == rr.learner_id,
            Transaction.course_id == enrollment.course_id,
        ).first()
        if tx:
            tx.refund_status = "refunded"

    db.commit()

    return {
        "message": "Refund approved and enrollment access revoked",
        "refund_id": str(rr.id),
        "enrollment_status": "refunded",
    }


@router.put("/refunds/{refund_id}/reject")
async def reject_refund(
    refund_id: str,
    body: Optional[RefundRequestResolve] = Body(default=None),
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

    enrollment = db.query(Enrollment).filter(Enrollment.id == rr.enrollment_id).first()
    if enrollment:
        tx = db.query(Transaction).filter(
            Transaction.learner_id == rr.learner_id,
            Transaction.course_id == enrollment.course_id,
        ).first()
        if tx:
            tx.refund_status = "rejected"

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
# Payout Batches (bundles real Transactions into a payout for a period).
# Powers the instructor-facing "Payout History" table (see routers/instructor.py
# and frontend EarningsChart.jsx), via Transaction.included_in_payout_id.
# Kept separate from the "Mark as Paid" snapshot endpoints above, which use a
# different set of columns on the same InstructorPayout table.
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/payouts/batches/run")
async def run_payout_batches(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: User = Depends(require_role("accounts")),
    db: Session = Depends(get_db),
):
    """Bundle all unpaid completed transactions into per-instructor payout batches."""
    query = (
        db.query(Transaction)
        .join(Course, Transaction.course_id == Course.id)
        .filter(
            Transaction.status == "completed",
            Transaction.refund_status == "none",
            Transaction.included_in_payout_id.is_(None),
        )
    )
    if start_date:
        query = query.filter(Transaction.created_at >= start_date)
    if end_date:
        query = query.filter(Transaction.created_at <= end_date)

    transactions = query.all()

    # Group by instructor
    by_instructor = {}
    for t in transactions:
        by_instructor.setdefault(t.course.instructor_id, []).append(t)

    created_payouts = []
    for instructor_id, trans_list in by_instructor.items():
        total_amount = sum(t.amount for t in trans_list)
        if total_amount > 0:
            payout = InstructorPayout(
                instructor_id=instructor_id,
                period_start=start_date,
                period_end=end_date,
                total_amount=total_amount,
                status="pending",
            )
            db.add(payout)
            db.flush()  # get payout.id

            for t in trans_list:
                t.included_in_payout_id = payout.id

            created_payouts.append(payout)

    db.commit()
    return {"message": f"Created {len(created_payouts)} payouts", "payouts": len(created_payouts)}


@router.get("/payouts/batches")
async def list_payout_batches(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(require_role("accounts")),
    db: Session = Depends(get_db),
):
    """List payout batches created by the run endpoint above."""
    query = (
        db.query(InstructorPayout)
        .filter(InstructorPayout.total_amount > 0)
        .order_by(InstructorPayout.created_at.desc())
    )
    total = query.count()
    payouts = query.offset(skip).limit(limit).all()

    items = [
        {
            "id": str(p.id),
            "instructor_name": p.instructor.name if p.instructor else "Unknown",
            "period_start": p.period_start.isoformat() if p.period_start else None,
            "period_end": p.period_end.isoformat() if p.period_end else None,
            "total_amount": p.total_amount,
            "status": p.status,
            "created_at": p.created_at.isoformat(),
            "released_at": p.released_at.isoformat() if p.released_at else None,
        }
        for p in payouts
    ]

    return {"items": items, "total": total, "skip": skip, "limit": limit}


@router.put("/payouts/batches/{payout_id}/release")
async def release_payout_batch(
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
    payout.released_at = datetime.now(timezone.utc)
    db.commit()
    return {"message": "Payout released successfully"}


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
        .order_by(func.coalesce(Enrollment.approved_at, Enrollment.enrolled_at).desc())
    )

    total = query.count()
    rows = query.offset((page - 1) * page_size).limit(page_size).all()

    invoices = []
    for enrollment, learner, course in rows:
        event_date = enrollment.approved_at or enrollment.enrolled_at or datetime.now(timezone.utc)
        invoices.append({
            "invoice_id": f"INV-{str(enrollment.id)[:8].upper()}",
            "enrollment_id": str(enrollment.id),
            "learner_name": learner.name,
            "learner_email": learner.email,
            "course_title": course.title,
            "amount": course.price,
            "invoice_date": event_date.isoformat(),
            "status": "paid",
        })

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
    total_revenue_all_time = round(float(sum(r[0] if isinstance(r, (tuple, list)) else getattr(r, 'price', 0.0) for r in all_time_rows if (r[0] if isinstance(r, (tuple, list)) else getattr(r, 'price', None)))), 2)

    # Monthly revenue (approved enrollments this month)
    monthly_rows = (
        db.query(Course.price)
        .join(Enrollment, Enrollment.course_id == Course.id)
        .filter(
            Enrollment.status == "approved",
            func.coalesce(Enrollment.approved_at, Enrollment.enrolled_at) >= month_start,
        )
        .all()
    )
    total_revenue_this_month = round(float(sum(r[0] if isinstance(r, (tuple, list)) else getattr(r, 'price', 0.0) for r in monthly_rows if (r[0] if isinstance(r, (tuple, list)) else getattr(r, 'price', None)))), 2)

    # Year-to-date revenue
    ytd_rows = (
        db.query(Course.price)
        .join(Enrollment, Enrollment.course_id == Course.id)
        .filter(
            Enrollment.status == "approved",
            func.coalesce(Enrollment.approved_at, Enrollment.enrolled_at) >= year_start,
        )
        .all()
    )
    total_revenue_ytd = round(float(sum(r[0] if isinstance(r, (tuple, list)) else getattr(r, 'price', 0.0) for r in ytd_rows if (r[0] if isinstance(r, (tuple, list)) else getattr(r, 'price', None)))), 2)

    # Total payouts issued (net sums from InstructorPayout records)
    payout_sum = db.query(func.sum(InstructorPayout.net_payout)).scalar() or 0.0
    payout_count = db.query(func.count(InstructorPayout.id)).scalar() or 0

    # Pending refunds
    pending_refunds = (
        db.query(func.count(RefundRequest.id))
        .filter(RefundRequest.status == "pending")
        .scalar() or 0
    )
    approved_refunds = (
        db.query(func.count(RefundRequest.id))
        .filter(RefundRequest.status == "approved")
        .scalar() or 0
    )

    # Total enrollments breakdown
    total_approved = (
        db.query(func.count(Enrollment.id))
        .filter(Enrollment.status == "approved")
        .scalar() or 0
    )
    total_refunded = (
        db.query(func.count(Enrollment.id))
        .filter(Enrollment.status == "refunded")
        .scalar() or 0
    )

    return {
        "revenue": {
            "all_time": total_revenue_all_time,
            "this_month": total_revenue_this_month,
            "year_to_date": total_revenue_ytd,
        },
        "payouts": {
            "total_issued": round(float(payout_sum), 2),
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
    }
