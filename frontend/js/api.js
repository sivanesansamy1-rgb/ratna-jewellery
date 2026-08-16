/* ==========================================================
   api.js — single source of truth for talking to the backend.
   Every other JS file calls window.api.* instead of using
   fetch() directly, so auth headers, error handling and the
   base URL only need to live in one place.
   ========================================================== */

const API_BASE = (() => {
  // Allow overriding the API origin without touching every file, e.g. when
  // the backend is deployed to Render/Railway instead of localhost.
  const override = window.localStorage.getItem('ratna_api_base');
  return override || 'http://localhost:5000/api';
})();

function getToken() {
  return localStorage.getItem('ratna_token');
}
function getAdminToken() {
  return localStorage.getItem('ratna_admin_token');
}

async function request(path, { method = 'GET', body, auth = true, isAdmin = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = isAdmin ? getAdminToken() : getToken();
  if (auth && token) headers['Authorization'] = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (networkErr) {
    throw new Error(
      'Could not reach the server. Make sure the backend is running (see backend/README) and try again.'
    );
  }

  let data = {};
  try {
    data = await res.json();
  } catch (_) {
    /* empty body, e.g. 204 */
  }

  if (!res.ok) {
    if (res.status === 401 && auth) {
      // Session expired — clear and let the calling page redirect to login.
      if (isAdmin) {
        localStorage.removeItem('ratna_admin_token');
        localStorage.removeItem('ratna_admin_user');
      } else {
        localStorage.removeItem('ratna_token');
        localStorage.removeItem('ratna_user');
      }
    }
    const err = new Error(data.message || `Request failed (${res.status})`);
    Object.assign(err, data);
    throw err;
  }
  return data;
}

window.api = {
  get: (path, opts) => request(path, { ...opts, method: 'GET' }),
  post: (path, body, opts) => request(path, { ...opts, method: 'POST', body }),
  put: (path, body, opts) => request(path, { ...opts, method: 'PUT', body }),
  del: (path, opts) => request(path, { ...opts, method: 'DELETE' }),
  base: API_BASE,
};
