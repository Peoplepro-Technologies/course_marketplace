const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.jsx')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('$')) {
        // Replace $ with ₹ only if not followed by { (so we don't break string interpolation)
        const replaced = content.replace(/\$(?!\{)/g, '₹');
        if (content !== replaced) {
          fs.writeFileSync(fullPath, replaced, 'utf8');
          console.log('Updated', fullPath);
        }
      }
    }
  }
}

processDir('c:\\internship\\course_marketplace\\frontend\\src');
