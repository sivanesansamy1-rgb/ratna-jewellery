document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('contact-form');
  const btn = document.getElementById('contact-submit-btn');
  const successMsg = document.getElementById('contact-success');
  const errorMsg = document.getElementById('contact-error');

  // Replace this with your Google Apps Script Web App URL
  const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzyvF9YRYQ6aaor2-JO7t-zHfMgRWroCeSE-ShQQKbhaTlYh-C0iUxPXAomYnnPv0r1/exec';

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (GOOGLE_SCRIPT_URL === 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE') {
        errorMsg.textContent = 'Please replace GOOGLE_SCRIPT_URL with your actual Web App URL in frontend/js/contact.js';
        errorMsg.classList.remove('hidden');
        successMsg.classList.add('hidden');
        return;
      }

      const originalBtnText = btn.textContent;
      btn.textContent = 'Sending...';
      btn.disabled = true;
      errorMsg.classList.add('hidden');
      successMsg.classList.add('hidden');

      const data = {
        name: document.getElementById('contact-name').value,
        email: document.getElementById('contact-email').value,
        subject: document.getElementById('contact-subject').value,
        message: document.getElementById('contact-message').value,
      };

      try {
        await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors', // This prevents the "Failed to fetch" CORS error
          body: JSON.stringify(data),
        });

        // Because we use no-cors, we can't read the response, so we just assume success if no network error occurred
        form.reset();
        successMsg.classList.remove('hidden');
      } catch (err) {
        errorMsg.textContent = 'Something went wrong: ' + err.message;
        errorMsg.classList.remove('hidden');
      } finally {
        btn.textContent = originalBtnText;
        btn.disabled = false;
      }
    });
  }
});
