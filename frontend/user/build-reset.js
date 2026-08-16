const fs = require('fs');
let html = fs.readFileSync('forgot-password.html', 'utf-8');
const mainBlock = `<main>
  <div class="auth-shell">
    <div class="card">
      <div class="text-center" style="margin-bottom:24px;">
        <div class="logo">RATNA<span>.</span></div>
        <p class="muted">Enter your new password below.</p>
      </div>
      <div class="form-msg success hidden" id="reset-msg"></div>
      <div class="form-msg error hidden" id="reset-error"></div>
      <form id="reset-password-form" onsubmit="handleResetPassword(event)">
        <div class="form-group"><label>New Password</label><input type="password" name="password" minlength="8" required/></div>
        <button class="btn btn-primary btn-block" type="submit">Update Password</button>
      </form>
      <p class="helper-link muted"><a href="/user/login.html">Back to Login</a></p>
    </div>
  </div>
</main>`;

html = html.split('<main>')[0] + mainBlock + html.split('</main>')[1];
html = html.replace('<title>Forgot Password — RATNA Fine Jewellery</title>', '<title>Reset Password — RATNA Fine Jewellery</title>');

fs.writeFileSync('reset-password.html', html);
console.log('Fixed reset-password.html correctly');
