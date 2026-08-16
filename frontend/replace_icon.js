const fs = require('fs');
const path = require('path');

const userDir = path.join(__dirname, 'user');
const files = fs.readdirSync(userDir).filter(f => f.endsWith('.html'));

const svgIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -4px;"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>`;

let replacedCount = 0;

for (const file of files) {
  const filePath = path.join(userDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace the specific emoji code with the SVG
  if (content.includes('&#128092;')) {
    content = content.replace(/&#128092;/g, svgIcon);
    fs.writeFileSync(filePath, content, 'utf8');
    replacedCount++;
  }
}

console.log(`Replaced icon in ${replacedCount} HTML files.`);
