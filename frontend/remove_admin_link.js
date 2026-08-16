const fs = require('fs');
const path = require('path');

const userDir = path.join(__dirname, 'user');
const files = fs.readdirSync(userDir).filter(f => f.endsWith('.html'));

let removedCount = 0;

for (const file of files) {
  const filePath = path.join(userDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Look for the list item containing "Admin Login" and remove it
  const regex = /<li>\s*<a href="[^"]*admin\/login\.html">\s*Admin Login\s*<\/a>\s*<\/li>\s*/gi;
  if (regex.test(content)) {
    content = content.replace(regex, '');
    fs.writeFileSync(filePath, content, 'utf8');
    removedCount++;
  }
}

console.log(`Removed Admin Login link from ${removedCount} HTML files.`);
