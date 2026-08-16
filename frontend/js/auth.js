/* ==========================================================
   auth.js — registration, login, logout, session helpers, and
   the nav-bar auth state used on every customer page.
   ========================================================== */

window.currentUser = () => {
  const raw = localStorage.getItem('ratna_user');
  return raw ? JSON.parse(raw) : null;
};

window.isLoggedIn = () => !!localStorage.getItem('ratna_token');

window.requireLogin = (redirectTo = '/user/login.html') => {
  if (!window.isLoggedIn()) {
    const next = encodeURIComponent(location.pathname.split('/').pop());
    location.href = `${redirectTo}?next=${next}`;
    return false;
  }
  return true;
};

window.logout = () => {
  localStorage.removeItem('ratna_token');
  localStorage.removeItem('ratna_user');
  window.dispatchEvent(new Event('ratna:cart-changed'));
  location.href = '/user/index.html';
};

async function handleRegisterForm(form) {
  const errorBox = form.querySelector('.form-error-box');
  const btn = form.querySelector('button[type="submit"]');
  const originalText = btn.textContent;
  errorBox.classList.add('hidden');
  const data = Object.fromEntries(new FormData(form).entries());

  if (data.password !== data.confirmPassword) {
    errorBox.textContent = 'Passwords do not match.';
    errorBox.classList.remove('hidden');
    return;
  }

  try {
    btn.textContent = 'Please wait...';
    btn.disabled = true;
    const res = await window.api.post('/auth/register', {
      name: data.name,
      email: data.email,
      phone: data.phone,
      password: data.password,
    });
    
    if (res.userId) {
      window.pendingUserId = res.userId;
      form.classList.add('hidden');
      const otpForm = document.getElementById('otp-form');
      if (otpForm) otpForm.classList.remove('hidden');
      const helperText = document.getElementById('login-helper-text');
      if (helperText) helperText.classList.add('hidden');
      window.showToast(res.message || 'OTP sent.');
    }
  } catch (err) {
    errorBox.textContent = err.message;
    errorBox.classList.remove('hidden');
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
  }
}

async function handleOtpForm(form) {
  const errorBox = form.querySelector('.form-error-box');
  const btn = form.querySelector('button[type="submit"]');
  const originalText = btn.textContent;
  errorBox.classList.add('hidden');
  const data = Object.fromEntries(new FormData(form).entries());

  if (!window.pendingUserId) {
    errorBox.textContent = 'Session expired. Please try registering again.';
    errorBox.classList.remove('hidden');
    return;
  }

  try {
    btn.textContent = 'Verifying...';
    btn.disabled = true;
    const res = await window.api.post('/auth/verify-otp', {
      userId: window.pendingUserId,
      otp: data.otp
    });
    localStorage.setItem('ratna_token', res.token);
    localStorage.setItem('ratna_user', JSON.stringify(res.user));
    window.showToast('Welcome to RATNA! Your account has been verified.');
    const params = new URLSearchParams(location.search);
    let nextUrl = params.get('next') || 'index.html';
    if (!nextUrl.startsWith('/')) nextUrl = '/user/' + nextUrl;
    location.href = nextUrl;
  } catch (err) {
    errorBox.textContent = err.message;
    errorBox.classList.remove('hidden');
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
  }
}

async function handleLoginForm(form) {
  const errorBox = form.querySelector('.form-error-box');
  const btn = form.querySelector('button[type="submit"]');
  const originalText = btn.textContent;
  errorBox.classList.add('hidden');
  const data = Object.fromEntries(new FormData(form).entries());

  try {
    btn.textContent = 'Please wait...';
    btn.disabled = true;
    const res = await window.api.post('/auth/login', { email: data.email, password: data.password });
    localStorage.setItem('ratna_token', res.token);
    localStorage.setItem('ratna_user', JSON.stringify(res.user));
    
    // Check if the user is an admin and redirect them to the admin dashboard
    if (res.user.role === 'admin') {
      localStorage.setItem('ratna_admin_token', res.token);
      localStorage.setItem('ratna_admin_user', JSON.stringify(res.user));
      window.showToast(`Welcome Admin, ${res.user.name.split(' ')[0]}!`);
      location.href = '/admin/dashboard.html';
      return;
    }
    
    window.showToast(`Welcome back, ${res.user.name.split(' ')[0]}!`);
    const params = new URLSearchParams(location.search);
    let nextUrl = params.get('next') || 'index.html';
    if (!nextUrl.startsWith('/')) nextUrl = '/user/' + nextUrl;
    location.href = nextUrl;
  } catch (err) {
    errorBox.textContent = err.message;
    errorBox.classList.remove('hidden');
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
  }
}

window.handleForgotPassword = async (event) => {
  event.preventDefault();
  const form = event.target;
  const errorBox = document.getElementById('reset-msg');
  const btn = form.querySelector('button[type="submit"]');
  const originalText = btn.textContent;
  
  errorBox.classList.add('hidden');
  errorBox.classList.remove('success', 'error');
  
  const data = Object.fromEntries(new FormData(form).entries());

  try {
    btn.textContent = 'Please wait...';
    btn.disabled = true;
    const res = await window.api.post('/auth/forgot-password', { email: data.email });
    
    errorBox.textContent = res.message;
    errorBox.classList.add('success');
    errorBox.classList.remove('hidden');
    form.reset();
  } catch (err) {
    errorBox.textContent = err.message;
    errorBox.classList.add('error');
    errorBox.classList.remove('hidden');
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
  }
};

window.handleResetPassword = async (event) => {
  event.preventDefault();
  const form = event.target;
  const errorBox = document.getElementById('reset-error');
  const successBox = document.getElementById('reset-msg');
  const btn = form.querySelector('button[type="submit"]');
  const originalText = btn.textContent;
  
  errorBox.classList.add('hidden');
  successBox.classList.add('hidden');
  
  const data = Object.fromEntries(new FormData(form).entries());
  
  // Extract token from URL
  const params = new URLSearchParams(location.search);
  const token = params.get('token');
  
  if (!token) {
    errorBox.textContent = 'Invalid or missing reset token.';
    errorBox.classList.remove('hidden');
    return;
  }

  try {
    btn.textContent = 'Updating...';
    btn.disabled = true;
    
    const res = await window.api.put(`/auth/reset-password/${token}`, { password: data.password });
    
    localStorage.setItem('ratna_token', res.token);
    localStorage.setItem('ratna_user', JSON.stringify(res.user));
    
    successBox.textContent = res.message + ' Redirecting...';
    successBox.classList.add('success');
    successBox.classList.remove('hidden');
    form.reset();
    
    setTimeout(() => {
      location.href = '/user/index.html';
    }, 1500);
  } catch (err) {
    errorBox.textContent = err.message;
    errorBox.classList.remove('hidden');
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
  }
};

// Renders the login/account state in the shared header include.
function renderAuthNav() {
  const slot = document.getElementById('nav-account-slot');
  if (!slot) return;
  const user = window.currentUser();
  if (user) {
    slot.innerHTML = `<a href="/user/account.html" class="icon-btn" title="My Account">&#128100; <span style="font-size:0.7rem;vertical-align:2px;">${window.escapeHTML(user.name.split(' ')[0])}</span></a>`;
  } else {
    slot.innerHTML = `<a href="/user/login.html" class="icon-btn logo" title="Login" style="text-decoration:none;">Login</a>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  renderAuthNav();
  const registerForm = document.getElementById('register-form');
  if (registerForm) registerForm.addEventListener('submit', (e) => { e.preventDefault(); handleRegisterForm(registerForm); });

  const otpForm = document.getElementById('otp-form');
  if (otpForm) otpForm.addEventListener('submit', (e) => { e.preventDefault(); handleOtpForm(otpForm); });

  const loginForm = document.getElementById('login-form');
  if (loginForm) loginForm.addEventListener('submit', (e) => { e.preventDefault(); handleLoginForm(loginForm); });

  document.querySelectorAll('[data-logout]').forEach((btn) => btn.addEventListener('click', window.logout));

  // Automatically highlight active navigation link
  const currentUrlObj = new URL(window.location.href);
  let currPath = currentUrlObj.pathname.replace(/\.html$/, '').replace(/\/$/, '');
  if (currPath.endsWith('/index')) currPath = currPath.slice(0, -6);
  if (currPath === '') currPath = '/';
  
  let hasExactMatch = false;
  
  const navLinks = document.querySelectorAll('.main-nav a, .footer-grid a');
  navLinks.forEach(link => {
    const linkUrlObj = new URL(link.href, window.location.origin);
    let linkPath = linkUrlObj.pathname.replace(/\.html$/, '').replace(/\/$/, '');
    if (linkPath.endsWith('/index')) linkPath = linkPath.slice(0, -6);
    if (linkPath === '') linkPath = '/';
    
    if (linkPath === currPath && linkUrlObj.search === currentUrlObj.search) {
      link.classList.add('active');
      hasExactMatch = true;
    } else {
      link.classList.remove('active');
    }
  });

  if (!hasExactMatch) {
    const matchingLinks = [];
    navLinks.forEach(link => {
      const linkUrlObj = new URL(link.href, window.location.origin);
      let linkPath = linkUrlObj.pathname.replace(/\.html$/, '').replace(/\/$/, '');
      if (linkPath.endsWith('/index')) linkPath = linkPath.slice(0, -6);
      if (linkPath === '') linkPath = '/';
      
      if (linkPath === currPath) {
        matchingLinks.push({ link, hasSearch: !!linkUrlObj.search });
      }
    });

    if (matchingLinks.length > 0) {
      // Prefer the link without search parameters (e.g. "Shop All" over "Bridal")
      const bestMatch = matchingLinks.find(m => !m.hasSearch) || matchingLinks[0];
      bestMatch.link.classList.add('active');
    }
  }

  // Global search bar logic
  const searchForm = document.getElementById('nav-search-form');
  if (searchForm) searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = searchForm.querySelector('input').value.trim();
    if (q) location.href = `/user/shop/?search=${encodeURIComponent(q)}`;
  });
});
