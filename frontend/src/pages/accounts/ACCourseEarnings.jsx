/**
 * ACCourseEarnings.jsx — Course earnings page for Accounts role.
 *
 * Shows course-level revenue, platform fee, and instructor cut.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import AccountsSidebarLayout from './AccountsSidebarLayout';

export default function ACCourseEarnings() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/accounts/course-earnings')
      .then(res => setData(res.data))
      .catch(err => setError(err.response?.data?.detail || 'Failed to load course earnings'))
      .finally(() => setLoading(false));
  }, []);

  const fmt = (num) => `₹${Number(num).toFixed(2)}`;

  let content;
  if (loading) {
    content = <LoadingSpinner />;
  } else if (error) {
    content = <div className="alert alert-danger">{error}</div>;
  } else if (data?.length === 0) {
    content = <p>No courses found.</p>;
  } else {
    content = (
      <div className="table-wrapper box-glow animate-fade-in">
        <table>
          <thead>
            <tr>
              <th>Course</th>
              <th>Instructor</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Enrollments</th>
              <th style={{ textAlign: 'right' }}>Price</th>
              <th style={{ textAlign: 'right' }}>Gross Revenue</th>
              <th style={{ textAlign: 'right' }}>Platform (20%)</th>
              <th style={{ textAlign: 'right' }}>Instructor (80%)</th>
            </tr>
          </thead>
          <tbody>
            {data.map(item => (
              <tr key={item.course_id}>
                <td><strong>{item.course_title}</strong></td>
                <td>{item.instructor_name}</td>
                <td>
                  <span className={`badge badge-${item.status === 'published' ? 'success' : 'secondary'}`}>
                    {item.status}
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>{item.approved_enrollments}</td>
                <td style={{ textAlign: 'right' }}>{item.price > 0 ? fmt(item.price) : 'Free'}</td>
                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{fmt(item.gross_revenue)}</td>
                <td style={{ textAlign: 'right', color: 'var(--color-primary)' }}>{fmt(item.platform_fee)}</td>
                <td style={{ textAlign: 'right', color: 'var(--color-success)' }}>{fmt(item.instructor_cut)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <AccountsSidebarLayout>
      <div className="section-header flex-between">
        <div>
          <h2>Course Earnings</h2>
          <p>Breakdown of revenue and payouts by course</p>
        </div>
      </div>
      
      {content}
    </AccountsSidebarLayout>
  );
}
