/**
 * fix_all_emojis.js — comprehensive emoji removal pass
 * Run from project root: node fix_all_emojis.js
 */
const fs = require('fs');
const path = require('path');

// Simple string replacements per file
// Format: { file, pairs: [[from, to], ...] }
const fixes = [
  // ── StarRating.jsx ─────────────────────────────────────────────
  {
    file: 'frontend/src/components/StarRating.jsx',
    pairs: [['★', '★']] // keep — it's a real character, not emoji, skip
  },

  // ── LessonViewer.jsx (4 remaining) ────────────────────────────
  // These are ✓ ✗ ○ characters (not full emoji range), but let's check
  {
    file: 'frontend/src/pages/learner/LessonViewer.jsx',
    pairs: [
      ["'✓ Correct!'", "'Correct!'"],
      ["'✗ Incorrect.'", "'Incorrect.'"],
      ["'✓ Submitted'", "'Submitted'"],
      ["'○'", "' '"],
    ]
  },

  // ── Accounts sub-pages ────────────────────────────────────────
  // ACFinancialReports
  {
    file: 'frontend/src/pages/accounts/ACFinancialReports.jsx',
    pairs: [
      ['📈 Financial Reports', 'Financial Reports'],
      ['📊', ''],
    ]
  },
  // ACInvoices
  {
    file: 'frontend/src/pages/accounts/ACInvoices.jsx',
    pairs: [
      ['🧾 Invoices', 'Invoices'],
      ['📄', ''],
      ['💳', ''],
    ]
  },
  // ACPaymentsRefunds
  {
    file: 'frontend/src/pages/accounts/ACPaymentsRefunds.jsx',
    pairs: [
      ['💳 Payments & Refunds', 'Payments & Refunds'],
      ['✅', ''],
      ['❌', '✗'],
      ['⚠️', '!'],
      ['💰', ''],
    ]
  },
  // ACPayouts
  {
    file: 'frontend/src/pages/accounts/ACPayouts.jsx',
    pairs: [
      ['🏦 Instructor Payouts', 'Instructor Payouts'],
      ['💰', ''],
      ['✅', ''],
      ['⏳', ''],
    ]
  },
  // ACReconciliation
  {
    file: 'frontend/src/pages/accounts/ACReconciliation.jsx',
    pairs: [
      ['🔄 Reconciliation', 'Reconciliation'],
      ['🚧', ''],
      ['🔧', ''],
    ]
  },
  // ACTransactions
  {
    file: 'frontend/src/pages/accounts/ACTransactions.jsx',
    pairs: [
      ['💰 Transactions', 'Transactions'],
      ['✅', ''],
      ['❌', '✗'],
      ['⚠️', '!'],
    ]
  },

  // ── Coordinator sub-pages ────────────────────────────────────
  // CategoryManager
  {
    file: 'frontend/src/pages/coordinator/CategoryManager.jsx',
    pairs: [
      ['🏷️ Category', 'Category'],
      ['✅', ''],
    ]
  },
  // CourseApprovals
  {
    file: 'frontend/src/pages/coordinator/CourseApprovals.jsx',
    pairs: [
      ['✅ Course Approvals', 'Course Approvals'],
      ['🎉', ''],
      ['✓', '✓'], // keep checkmark — it's not emoji
      ['⚠️', '!'],
      ['📚', ''],
      ['🔍', ''],
    ]
  },
  // CourseCatalog
  {
    file: 'frontend/src/pages/coordinator/CourseCatalog.jsx',
    pairs: [
      ['📚 Course Catalog', 'Course Catalog'],
      ['🔍', ''],
    ]
  },
  // InstructorRoster
  {
    file: 'frontend/src/pages/coordinator/InstructorRoster.jsx',
    pairs: [
      ['👨‍🏫 Instructor Roster', 'Instructor Roster'],
      ['👤', ''],
      ['⚠️', '!'],
    ]
  },
  // QualityReviews
  {
    file: 'frontend/src/pages/coordinator/QualityReviews.jsx',
    pairs: [
      ['⭐ Quality', 'Quality'],
    ]
  },
  // Reports
  {
    file: 'frontend/src/pages/coordinator/Reports.jsx',
    pairs: [
      ['📈 Reports', 'Reports'],
      ['📊', ''],
    ]
  },

  // ── SubAdmin remaining ────────────────────────────────────────
  {
    file: 'frontend/src/pages/subadmin/SubAdminCategories.jsx',
    pairs: [
      ['🏷️ Category', 'Category'],
    ]
  },

  // ── CourseDetail.jsx ─────────────────────────────────────────
  {
    file: 'frontend/src/pages/CourseDetail.jsx',
    pairs: [
      ['🌟', ''],
      ['📚', ''],
      ['⏱️', ''],
      ['🎓', ''],
      ['✓', '✓'], // keep
      ['💰', ''],
      ['🔒', ''],
    ]
  },

  // ── JitsiRoomModal.jsx ────────────────────────────────────────
  {
    file: 'frontend/src/components/JitsiRoomModal.jsx',
    pairs: [
      ['🎥', ''],
      ['📹', ''],
      ['🎤', ''],
    ]
  },

  // ── ProtectedRoute.jsx ────────────────────────────────────────
  {
    file: 'frontend/src/components/ProtectedRoute.jsx',
    pairs: [
      ['🔐', ''],
      ['⚠️', '!'],
      ['🚫', ''],
    ]
  },

  // ── VideoPlayer.jsx ───────────────────────────────────────────
  {
    file: 'frontend/src/components/VideoPlayer.jsx',
    pairs: [
      ['🎬', ''],
      ['▶️', ''],
    ]
  },

  // ── HomePage.jsx (4 found) ────────────────────────────────────
  {
    file: 'frontend/src/pages/HomePage.jsx',
    pairs: [
      ['🎯', ''],
      ['🔥', ''],
      ['⭐', ''],
      ['💎', ''],
    ]
  },
];

let totalFixed = 0;

for (const { file, pairs } of fixes) {
  const fullPath = path.resolve(file);
  if (!fs.existsSync(fullPath)) {
    console.log(`SKIP: ${file}`);
    continue;
  }
  let content = fs.readFileSync(fullPath, 'utf8');
  let changed = false;
  for (const [from, to] of pairs) {
    if (from === to) continue; // skip no-ops
    if (content.includes(from)) {
      content = content.split(from).join(to);
      console.log(`  FIXED [${file}] "${from}" -> "${to}"`);
      changed = true;
      totalFixed++;
    }
  }
  if (changed) {
    fs.writeFileSync(fullPath, content, 'utf8');
  }
}

console.log(`\nTotal replacements: ${totalFixed}`);

// Now do a second pass to count remaining actual emojis
const emojiRegex = /[\u{1F300}-\u{1FFFF}\u{2600}-\u{27BF}]/gu;
const glob = require('child_process').execSync('dir /s /b *.jsx', {cwd: 'frontend\\src', encoding:'utf8'});
const files = glob.trim().split('\r\n').filter(Boolean);
let remaining = 0;
for (const f of files) {
  const c = fs.readFileSync(f, 'utf8');
  const m = [...c.matchAll(emojiRegex)];
  if (m.length > 0) {
    console.log(`STILL HAS: ${f.replace(process.cwd()+'\\frontend\\src\\','')}: ${m.length} chars: ${[...new Set(m.map(x=>x[0]))].join(' ')}`);
    remaining += m.length;
  }
}
console.log(`\nREMAINING EMOJI CHARS: ${remaining}`);
