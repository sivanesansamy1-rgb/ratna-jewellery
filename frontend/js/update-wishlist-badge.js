const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../user');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

files.forEach(f => {
  const file = path.join(dir, f);
  let content = fs.readFileSync(file, 'utf8');
  
  // Replace the exact wishlist anchor tag to include the badge span
  const target = '<a href="/user/wishlist.html" class="icon-btn" title="Wishlist">&#9825;</a>';
  const replacement = '<a href="/user/wishlist.html" class="icon-btn" title="Wishlist">&#9825;<span class="badge hidden" id="wishlist-count-badge">0</span></a>';
  
  if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(file, content);
    console.log(`Updated ${f}`);
  }
});
