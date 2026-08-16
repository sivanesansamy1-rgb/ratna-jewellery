const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'user/register.html');
const lines = fs.readFileSync(filePath, 'utf8').split('\n');

// We want to keep 0 to 63, and then the original form closing which is at 128 to end
// Let's verify line 64 is <!DOCTYPE html>
if (lines[63].trim() === '<!DOCTYPE html>') {
  const newLines = [...lines.slice(0, 63), ...lines.slice(127)];
  fs.writeFileSync(filePath, newLines.join('\n'), 'utf8');
  console.log('Fixed register.html!');
} else {
  console.log('Line 64 is not DOCTYPE, check file manually.');
}
