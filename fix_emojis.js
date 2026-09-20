const fs = require('fs');
const path = require('path');

const replacements = [
  // SuperAdmin pages
  { file: 'frontend/src/pages/superadmin/SARolesPermissions.jsx', from: '🔐 Roles', to: 'Roles' },
  { file: 'frontend/src/pages/superadmin/SAUserManagement.jsx', from: '👥 User Management', to: 'User Management' },
  { file: 'frontend/src/pages/superadmin/SAReportsAnalytics.jsx', from: '📈 Reports', to: 'Reports' },
  { file: 'frontend/src/pages/superadmin/SAPaymentsFinance.jsx', from: '💳 Payments', to: 'Payments' },
  { file: 'frontend/src/pages/superadmin/SACourseManagement.jsx', from: '📚 Course Management', to: 'Course Management' },
  { file: 'frontend/src/pages/superadmin/SACategories.jsx', from: '🏷️ Category Management', to: 'Category Management' },
  { file: 'frontend/src/pages/superadmin/SAAuditLogs.jsx', from: '📋 Audit Logs', to: 'Audit Logs' },
  { file: 'frontend/src/pages/superadmin/SAApprovals.jsx', from: '✅ Course Approvals', to: 'Course Approvals' },
  { file: 'frontend/src/pages/superadmin/SAApprovals.jsx', from: '🎉', to: '' },
  // SubAdmin pages
  { file: 'frontend/src/pages/subadmin/SubAdminApprovals.jsx', from: '✅ Course Approvals', to: 'Course Approvals' },
  { file: 'frontend/src/pages/subadmin/SubAdminApprovals.jsx', from: '🎉', to: '' },
  { file: 'frontend/src/pages/subadmin/SubAdminCourseManagement.jsx', from: '📚 Course Management', to: 'Course Management' },
  { file: 'frontend/src/pages/subadmin/SubAdminReports.jsx', from: '📈 Reports', to: 'Reports' },
  { file: 'frontend/src/pages/subadmin/SubAdminUserManagement.jsx', from: '👥 User Management', to: 'User Management' },
  // Coordinator pages
  { file: 'frontend/src/pages/coordinator/CoordinatorDashboard.jsx', from: '⚠️ Could not', to: 'Could not' },
  // Learner pages  
  { file: 'frontend/src/pages/learner/LearnerDashboard.jsx', from: '✓ ', to: '' },
];

// Also do star replacements in review moderation files
const starFiles = [
  'frontend/src/pages/superadmin/SAReviewsModeration.jsx',
  'frontend/src/pages/subadmin/SubAdminReviewsModeration.jsx',
];

for (const { file, from, to } of replacements) {
  const fullPath = path.resolve(file);
  if (!fs.existsSync(fullPath)) {
    console.log(`SKIP (not found): ${file}`);
    continue;
  }
  let content = fs.readFileSync(fullPath, 'utf8');
  const before = content;
  content = content.split(from).join(to);
  if (content !== before) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`FIXED: ${file} - replaced "${from}"`);
  } else {
    console.log(`NO MATCH: ${file} - "${from}"`);
  }
}

// Fix star ratings in reviews — replace emoji stars with text stars
for (const file of starFiles) {
  const fullPath = path.resolve(file);
  if (!fs.existsSync(fullPath)) continue;
  let content = fs.readFileSync(fullPath, 'utf8');
  const before = content;
  // Replace emoji star lines with numeric rating display
  content = content.replace(
    /'★'\.repeat\(review\.rating\)\}\{'☆'\.repeat\(5 - review\.rating\)\}/g,
    '`${review.rating}/5 ★`'
  );
  if (content !== before) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`FIXED stars: ${file}`);
  }
}

console.log('Done!');
