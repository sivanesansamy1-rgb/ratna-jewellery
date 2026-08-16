const fs = require('fs');
const path = require('path');

const indexHtml = fs.readFileSync(path.join(__dirname, '../user/index.html'), 'utf8');
const shopHtml = fs.readFileSync(path.join(__dirname, '../user/shop.html'), 'utf8');

// Find the footer starting point in index.html
const footerStart = indexHtml.indexOf('<footer class="site-footer">');
const correctFooterAndScripts = indexHtml.substring(footerStart);

// We need to inject the filter logic into the script tags in correctFooterAndScripts
const scriptInjection = `
    const filterBtn = document.getElementById('filter-toggle-btn');
    const filterAside = document.querySelector('.filters');
    if (filterBtn && filterAside) {
      filterBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        filterAside.classList.toggle('open');
      });
      document.addEventListener('click', (e) => {
        if (filterAside.classList.contains('open') && !filterAside.contains(e.target) && e.target !== filterBtn) {
          filterAside.classList.remove('open');
        }
      });
    }
`;

const modifiedFooterAndScripts = correctFooterAndScripts.replace('document.getElementById(\'newsletter-form\')', scriptInjection + '\n    document.getElementById(\'newsletter-form\')');

// Find the bad footer in shop.html (it starts at <footer class="site-footer"> and cuts off)
const badFooterStart = shopHtml.indexOf('<footer class="site-footer">');
let newShopHtml;
if (badFooterStart !== -1) {
  newShopHtml = shopHtml.substring(0, badFooterStart) + modifiedFooterAndScripts;
} else {
  newShopHtml = shopHtml + modifiedFooterAndScripts;
}

fs.writeFileSync(path.join(__dirname, '../user/shop.html'), newShopHtml);
console.log('Fixed shop.html');
