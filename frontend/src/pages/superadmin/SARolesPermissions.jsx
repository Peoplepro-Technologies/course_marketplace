/**
 * SARolesPermissions.jsx — Read-only permission matrix for Super Admin.
 *
 * Displays what each role can access across the platform.
 * Purely frontend — no API calls needed.
 */

import SASidebarLayout from './SASidebarLayout';

const ROLES = [
  'Learner',
  'Instructor',
  'Course Coordinator',
  'Accounts',
  'Sub Admin',
  'Admin',
  'Super Admin',
];

const PERMISSIONS = [
  { name: 'Browse & Enroll',         l: true,  i: true,  cc: true,  ac: true,  sa2: true, a: true,  s: true },
  { name: 'View Lesson Videos',      l: true,  i: false, cc: false, ac: false, sa2: false, a: false, s: true },
  { name: 'Submit Reviews',          l: true,  i: false, cc: false, ac: false, sa2: false, a: false, s: true },
  { name: 'Create / Edit Courses',   l: false, i: true,  cc: false, ac: false, sa2: false, a: false, s: true },
  { name: 'Manage Sections & Lessons',l: false, i: true,  cc: false, ac: false, sa2: false, a: false, s: true },
  { name: 'View Student Progress',   l: false, i: true,  cc: false, ac: false, sa2: false, a: false, s: true },
  { name: 'View Earnings',           l: false, i: true,  cc: false, ac: true,  sa2: false, a: false, s: true },
  { name: 'Approve / Reject Courses',l: false, i: false, cc: true,  ac: false, sa2: false, a: true,  s: true },
  { name: 'Manage Categories',       l: false, i: false, cc: true,  ac: false, sa2: false, a: false, s: true },
  { name: 'Moderate Reviews',        l: false, i: false, cc: true,  ac: false, sa2: false, a: true,  s: true },
  { name: 'View Reports',            l: false, i: false, cc: true,  ac: true,  sa2: false, a: true,  s: true },
  { name: 'Manage Enrollments',      l: false, i: false, cc: false, ac: false, sa2: true,  a: true,  s: true },
  { name: 'Manage Users & Roles',    l: false, i: false, cc: false, ac: false, sa2: false, a: false, s: true },
  { name: 'Override Course Status',  l: false, i: false, cc: false, ac: false, sa2: false, a: true,  s: true },
  { name: 'View Audit Logs',         l: false, i: false, cc: false, ac: false, sa2: false, a: false, s: true },
  { name: 'Platform Settings',       l: false, i: false, cc: false, ac: false, sa2: false, a: false, s: true },
  { name: 'Finance Overview',        l: false, i: false, cc: false, ac: true,  sa2: false, a: false, s: true },
];

export default function SARolesPermissions() {
  const roleKeys = ['l', 'i', 'cc', 'ac', 'sa2', 'a', 's'];

  return (
    <SASidebarLayout>
      <div className="sa-page-header">
        <h2>🔐 Roles & Permissions</h2>
        <p>Read-only view of what each role can access on the platform.</p>
      </div>

      <div className="sa-table-wrapper sa-permission-matrix">
        <table>
          <thead>
            <tr>
              <th>Permission</th>
              {ROLES.map(r => (
                <th key={r} style={{ fontSize: 'var(--text-xs)', whiteSpace: 'nowrap' }}>{r}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSIONS.map(perm => (
              <tr key={perm.name}>
                <td>{perm.name}</td>
                {roleKeys.map(key => (
                  <td key={key}>
                    {perm[key]
                      ? <span className="sa-perm-check">✓</span>
                      : <span className="sa-perm-x">—</span>
                    }
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--space-md)' }}>
        This matrix is for reference only. Actual permissions are enforced by the backend role-checking system.
      </p>
    </SASidebarLayout>
  );
}
