const fs = require('fs');
const path = require('path');

function processDir(dir) {
  let count = 0;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      count += processDir(fullPath);
    } else if (file.endsWith('.html')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      const regex = /<div class="top-bar">[\s\S]*?<\/div>/g;
      if (regex.test(content)) {
        content = content.replace(regex, '');
        fs.writeFileSync(fullPath, content, 'utf8');
        count++;
      }
    }
  }
  return count;
}

const frontendDir = path.join(__dirname, '.');
const removedCount = processDir(frontendDir);
console.log(`Removed top-bar from ${removedCount} HTML files.`);
