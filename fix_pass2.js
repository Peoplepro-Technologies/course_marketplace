/**
 * fix_pass2.js — second-pass emoji removal for chars not caught before
 * Note: ✓ ✗ ★ ☆ ✕ ○ ⚠ etc. are in range U+2600–U+27BF
 * We KEEP ✓ ✗ ★ ☆ where they are semantic (star ratings, checkmarks in tables)
 * We REMOVE: ⚠ (standalone) → '!', 🔓 📄 ❤ 🤍 📂 🎬 📈 🧾 💳 🏦 🔄 🏷 etc.
 */
const fs = require('fs');
const path = require('path');

const emoji2regex = /[\u{1F300}-\u{1FFFF}]/gu; // only "real" emoji above BMP

const files = require('child_process')
  .execSync('dir /s /b *.jsx', {cwd: 'frontend\\src', encoding:'utf8'})
  .trim().split('\r\n').filter(Boolean);

let totalFixed = 0;
for (const f of files) {
  let content = fs.readFileSync(f, 'utf8');
  const before = content;
  
  // Remove all above-BMP emoji (keeps ✓ ✗ ★ ☆ ⚠ etc. which are BMP)
  content = content.replace(emoji2regex, '');
  
  // Also remove ⚠️ (U+26A0 + U+FE0F variation selector) -> '!'
  content = content.replace(/⚠️/g, '!');
  
  if (content !== before) {
    fs.writeFileSync(f, content, 'utf8');
    const shortPath = f.replace(path.resolve('frontend\\src')+'\\', '');
    console.log(`FIXED: ${shortPath}`);
    totalFixed++;
  }
}
console.log(`\nFiles fixed: ${totalFixed}`);

// Final count
let remaining = 0;
const emojiAll = /[\u{1F300}-\u{1FFFF}\u{2600}-\u{27BF}\u{2300}-\u{23FF}]/gu;
for (const f of files) {
  const c = fs.readFileSync(f, 'utf8');
  const m = [...c.matchAll(emojiAll)].filter(x => {
    const cp = x[0].codePointAt(0);
    // Allow: ✓(U+2713), ✗(U+2717), ★(U+2605), ☆(U+2606), ✕(U+2715), —(U+2014), →(U+2192)
    return ![0x2713,0x2717,0x2605,0x2606,0x2715,0x2014,0x2192,0x2190,0x2022,0x00B7].includes(cp);
  });
  if (m.length > 0) {
    const shortPath = f.replace(path.resolve('frontend\\src')+'\\','');
    const unique = [...new Set(m.map(x=>x[0]))].map(c=>`${c}(U+${c.codePointAt(0).toString(16).toUpperCase()})`);
    console.log(`REMAINING: ${shortPath}: ${m.length} → ${unique.join(' ')}`);
    remaining += m.length;
  }
}
console.log(`\nFINAL REMAINING: ${remaining}`);
