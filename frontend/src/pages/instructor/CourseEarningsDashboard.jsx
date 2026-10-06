import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import api from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function CourseEarningsDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/instructor/earnings')
      .then(res => setData(res.data))
      .catch(err => {
        console.error(err);
        setError('Failed to load course earnings data');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-wrapper"><LoadingSpinner /></div>;
  if (error) return <div className="page-wrapper container"><div className="alert alert-danger">{error}</div></div>;

  const courseEarnings = data?.course_earnings || [];
  const hasData = courseEarnings.length > 0;

  return (
    <div className="page-wrapper container animate-fade-in">
      <div className="section-header flex-between">
        <div>
          <h2>Course Earnings</h2>
          <p>Detailed breakdown of earnings per course.</p>
        </div>
        <Link to="/instructor" className="btn btn-secondary">
          ← Dashboard
        </Link>
      </div>

      <div className="card-glass" style={{ marginBottom: '2rem', padding: '2rem' }}>
        <h3>Earnings Breakdown</h3>
        {hasData ? (
          <div style={{ height: '400px', marginTop: '2rem' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={courseEarnings}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="rgba(0,0,0,0.06)" />
                <XAxis type="number" tickFormatter={(v) => `₹${v}`} />
                <YAxis dataKey="title" type="category" width={150} tick={{ fontSize: 12, fill: '#666' }} />
                <Tooltip 
                  formatter={(value) => [`₹${value}`, 'Earnings']}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="amount" fill="#0056D2" radius={[0, 4, 4, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#666' }}>
            No earnings data available per course yet.
          </div>
        )}
      </div>

      <div className="card-glass">
        <h3>Course Earnings Details</h3>
        <div className="table-responsive" style={{ marginTop: '1rem' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Course Name</th>
                <th style={{ textAlign: 'right' }}>Total Earned</th>
              </tr>
            </thead>
            <tbody>
              {hasData ? (
                courseEarnings.map(course => (
                  <tr key={course.course_id}>
                    <td>
                      <strong>{course.title}</strong>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#0056D2' }}>
                      ₹{course.amount.toFixed(2)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="2" style={{ textAlign: 'center', padding: '2rem' }}>
                    No data
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
