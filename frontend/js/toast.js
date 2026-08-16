/* Small shared toast + gem-loader helpers used across every page. */

function ensureToastEl() {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    document.body.appendChild(el);
  }
  return el;
}

window.showToast = (message, type = 'success') => {
  const el = ensureToastEl();
  el.textContent = message;
  el.className = type === 'error' ? 'error show' : 'show';
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
};

window.gemLoaderHTML = `
  <div class="loader-wrap"><div class="gem-loader">
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="24,4 40,18 24,44 8,18" stroke="#B8925A" stroke-width="2" fill="rgba(184,146,90,0.15)"/>
      <polygon points="24,4 8,18 40,18" stroke="#B8925A" stroke-width="1.4" fill="none"/>
      <line x1="24" y1="4" x2="24" y2="44" stroke="#B8925A" stroke-width="1"/>
    </svg>
  </div></div>`;

window.formatINR = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

window.escapeHTML = (str = '') =>
  String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

window.showConfirmModal = (title, message, confirmText = 'Confirm', cancelText = 'Cancel') => {
  return new Promise((resolve) => {
    let overlay = document.getElementById('custom-modal');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'custom-modal';
      overlay.className = 'custom-modal-overlay';
      document.body.appendChild(overlay);
    }
    overlay.innerHTML = `
      <div class="custom-modal-box">
        <h3>${window.escapeHTML(title)}</h3>
        <p>${window.escapeHTML(message)}</p>
        <div class="custom-modal-actions">
          <button class="btn btn-outline" id="custom-modal-cancel">${window.escapeHTML(cancelText)}</button>
          <button class="btn btn-primary" id="custom-modal-confirm">${window.escapeHTML(confirmText)}</button>
        </div>
      </div>
    `;
    
    // Force reflow for transition
    void overlay.offsetWidth;
    overlay.classList.add('show');

    const close = (result) => {
      overlay.classList.remove('show');
      setTimeout(() => overlay.remove(), 300);
      resolve(result);
    };

    document.getElementById('custom-modal-cancel').onclick = () => close(false);
    document.getElementById('custom-modal-confirm').onclick = () => close(true);
  });
};

window.showPromptModal = (title, message, confirmText = 'Submit', cancelText = 'Cancel') => {
  return new Promise((resolve) => {
    let overlay = document.getElementById('custom-modal');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'custom-modal';
      overlay.className = 'custom-modal-overlay';
      document.body.appendChild(overlay);
    }
    overlay.innerHTML = `
      <div class="custom-modal-box">
        <h3>${window.escapeHTML(title)}</h3>
        <p>${window.escapeHTML(message)}</p>
        <div class="custom-modal-input-wrap">
          <input type="text" id="custom-modal-input" autocomplete="off" />
        </div>
        <div class="custom-modal-actions">
          <button class="btn btn-outline" id="custom-modal-cancel">${window.escapeHTML(cancelText)}</button>
          <button class="btn btn-primary" id="custom-modal-confirm">${window.escapeHTML(confirmText)}</button>
        </div>
      </div>
    `;
    
    // Force reflow for transition
    void overlay.offsetWidth;
    overlay.classList.add('show');
    const input = document.getElementById('custom-modal-input');
    input.focus();

    const close = (result) => {
      overlay.classList.remove('show');
      setTimeout(() => overlay.remove(), 300);
      resolve(result);
    };

    document.getElementById('custom-modal-cancel').onclick = () => close(null);
    document.getElementById('custom-modal-confirm').onclick = () => close(input.value.trim());
    input.onkeydown = (e) => {
      if (e.key === 'Enter') close(input.value.trim());
      if (e.key === 'Escape') close(null);
    };
  });
};
