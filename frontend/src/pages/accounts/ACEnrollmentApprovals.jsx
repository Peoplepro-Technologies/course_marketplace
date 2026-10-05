/**
 * ACEnrollmentApprovals.jsx — Learner Course Approval management for Accounts.
 */

import { useState, useEffect, useCallback } from "react";
import api from "../../api/axios";
import AccountsSidebarLayout from "./AccountsSidebarLayout";

const STATUS_TABS = [
  { key: "",         label: "All" },
  { key: "pending",  label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

const STATUS_CONFIG = {
  pending:  { color: "#f59e0b", bg: "#fef3c7", label: "Pending"  },
  approved: { color: "#10b981", bg: "#d1fae5", label: "Approved" },
  rejected: { color: "#ef4444", bg: "#fee2e2", label: "Rejected" },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "4px",
      padding: "4px 10px", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600,
      background: cfg.bg, color: cfg.color,
    }}>
      {cfg.label}
    </span>
  );
}

export default function ACEnrollmentApprovals() {
  const [enrollments, setEnrollments] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [actionLoading, setActionLoading] = useState({});

  const PAGE_SIZE = 20;

  const fetchEnrollments = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page, page_size: PAGE_SIZE });
      if (statusFilter) params.append("status", statusFilter);
      if (search) params.append("search", search);
      const res = await api.get(`/accounts/enrollments?${params}`);
      setEnrollments(res.data.enrollments || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to load enrollments");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  useEffect(() => { fetchEnrollments(); }, [fetchEnrollments]);

  const handleAction = async (enrollmentId, action) => {
    setActionLoading(prev => ({ ...prev, [enrollmentId]: action }));
    try {
      await api.put(`/accounts/enrollments/${enrollmentId}/${action}`);
      setEnrollments(prev =>
        prev.map(e =>
          e.enrollment_id === enrollmentId
            ? { ...e, status: action === "approve" ? "approved" : "rejected" }
            : e
        )
      );
    } catch (err) {
      alert(err.response?.data?.detail || `Failed to ${action}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [enrollmentId]: null }));
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <AccountsSidebarLayout>
      <div style={{ padding: "2rem", maxWidth: "1100px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--color-text-primary)", margin: 0 }}>
            Learner Course Approvals
          </h2>
          <p style={{ color: "var(--color-text-muted)", marginTop: "0.35rem", fontSize: "0.9rem" }}>
            Review and approve or reject learner enrollment requests.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem", borderBottom: "2px solid var(--color-border)", paddingBottom: "0" }}>
          {STATUS_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => { setStatusFilter(tab.key); setPage(1); }}
              style={{
                padding: "0.5rem 1.2rem", border: "none", background: "transparent", cursor: "pointer",
                fontSize: "0.9rem", fontWeight: statusFilter === tab.key ? 700 : 500,
                color: statusFilter === tab.key ? "var(--color-primary)" : "var(--color-text-muted)",
                borderBottom: statusFilter === tab.key ? "2px solid var(--color-primary)" : "2px solid transparent",
                marginBottom: "-2px", transition: "all 0.15s",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.25rem" }}>
          <form onSubmit={handleSearch} style={{ display: "flex", gap: "0.5rem", flex: 1 }}>
            <div style={{ position: "relative", flex: 1 }}>
              <input
                type="text"
                placeholder="Search by learner name, email, or course..."
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                style={{ width: "100%", paddingLeft: "12px", paddingRight: "12px", height: "38px", borderRadius: "8px", border: "1px solid var(--color-border)", background: "var(--color-bg-secondary)", color: "var(--color-text-primary)", fontSize: "0.9rem", boxSizing: "border-box" }}
              />
            </div>
            <button type="submit" className="btn btn-primary btn-sm">Search</button>
          </form>
          <button onClick={() => { setSearchInput(""); setSearch(""); setPage(1); }} className="btn btn-secondary btn-sm" title="Refresh">Reset</button>
        </div>

        {!loading && (
          <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", marginBottom: "1rem" }}>
            Showing {enrollments.length} of {total} enrollment{total !== 1 ? "s" : ""}
          </p>
        )}

        {error && (
          <div style={{ background: "#fee2e2", color: "#991b1b", padding: "0.75rem 1rem", borderRadius: "8px", marginBottom: "1rem", fontSize: "0.9rem" }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "var(--color-text-muted)" }}>Loading enrollments...</div>
        ) : enrollments.length === 0 ? (
          <div style={{ textAlign: "center", padding: "4rem", color: "var(--color-text-muted)" }}>
            <p>No enrollments found.</p>
          </div>
        ) : (
          <div style={{ background: "var(--color-bg-secondary)", borderRadius: "12px", overflow: "hidden", border: "1px solid var(--color-border)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr 1fr 1fr", gap: "1rem", padding: "0.75rem 1.25rem", background: "var(--color-primary)", color: "#fff", fontSize: "0.8rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>
              <span>Learner</span><span>Course</span><span>Enrolled</span><span>Status</span><span>Actions</span>
            </div>
            {enrollments.map((enr, idx) => (
              <div key={enr.enrollment_id} style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr 1fr 1fr", gap: "1rem", padding: "1rem 1.25rem", alignItems: "center", borderTop: idx === 0 ? "none" : "1px solid var(--color-border)", background: enr.status === "pending" ? "rgba(245,158,11,0.04)" : "transparent" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--color-primary)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: "0.85rem", flexShrink: 0 }}>
                    {enr.learner_name?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--color-text-primary)" }}>{enr.learner_name}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>{enr.learner_email}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  {enr.course_thumbnail ? (
                    <img src={enr.course_thumbnail.startsWith("/media/") ? `http://localhost:8000${enr.course_thumbnail}` : enr.course_thumbnail} alt="" style={{ width: 40, height: 30, objectFit: "cover", borderRadius: 4, flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 40, height: 30, background: "var(--color-bg-tertiary)", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    </div>
                  )}
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--color-text-primary)" }}>{enr.course_title}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Rs.{enr.course_price?.toLocaleString("en-IN")}</div>
                  </div>
                </div>
                <div style={{ fontSize: "0.82rem", color: "var(--color-text-muted)" }}>
                  {new Date(enr.enrolled_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </div>
                <div><StatusBadge status={enr.status} /></div>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  {enr.status !== "approved" && (
                    <button onClick={() => handleAction(enr.enrollment_id, "approve")} disabled={!!actionLoading[enr.enrollment_id]} style={{ background: "#10b981", color: "#fff", border: "none", display: "flex", alignItems: "center", gap: "4px", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontWeight: 600, fontSize: "0.8rem" }}>

                      {actionLoading[enr.enrollment_id] === "approve" ? "..." : "Approve"}
                    </button>
                  )}
                  {enr.status !== "rejected" && (
                    <button onClick={() => handleAction(enr.enrollment_id, "reject")} disabled={!!actionLoading[enr.enrollment_id]} style={{ background: "#ef4444", color: "#fff", border: "none", display: "flex", alignItems: "center", gap: "4px", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontWeight: 600, fontSize: "0.8rem" }}>

                      {actionLoading[enr.enrollment_id] === "reject" ? "..." : "Reject"}
                    </button>
                  )}
                  {enr.status === "approved" && (
                    <span style={{ fontSize: "0.8rem", color: "#10b981", fontWeight: 600 }}>Access Granted</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", marginTop: "1.5rem" }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</button>
            <span style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem", color: "var(--color-text-muted)" }}>Page {page} of {totalPages}</span>
            <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</button>
          </div>
        )}
      </div>
    </AccountsSidebarLayout>
  );
}
