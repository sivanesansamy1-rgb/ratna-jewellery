const fs = require('fs');
const path = require('path');

const userDir = path.join(__dirname, 'user');
const files = fs.readdirSync(userDir).filter(f => f.endsWith('.html'));

const svgIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -4px;"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`;

let replacedCount = 0;

for (const file of files) {
  const filePath = path.join(userDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace the specific heart emoji code with the SVG
  if (content.includes('&#9825;')) {
    content = content.replace(/&#9825;/g, svgIcon);
    fs.writeFileSync(filePath, content, 'utf8');
    replacedCount++;
  }
}

console.log(`Replaced heart icon in ${replacedCount} HTML files.`);
