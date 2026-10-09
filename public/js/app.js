// Shared GHSQUI frontend behavior: dark mode toggle + auth-aware navigation.
async function getJSON(url, options) {
  const res = await fetch(url, options);
  let body = null;
  try { body = await res.json(); } catch (e) { /* ignore */ }
  if (!res.ok) throw new Error((body && body.error) || 'Request failed');
  return body;
}

function initTheme() {
  const saved = localStorage.getItem('ghsqui-theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  const btn = document.getElementById('theme-toggle');
  if (btn) {
    btn.addEventListener('click', () => {
      const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('ghsqui-theme', next);
    });
  }
}

async function initNav() {
  const userEl = document.getElementById('nav-user');
  const authEl = document.getElementById('nav-auth');
  try {
    const { user } = await getJSON('/api/auth/me');
    if (userEl) userEl.textContent = user.username + (user.role !== 'player' ? ' [' + user.role + ']' : '');
    if (authEl) { authEl.textContent = 'LOG OUT'; authEl.href = '#'; authEl.id = 'nav-logout'; }
    document.body.setAttribute('data-auth', 'yes');
  } catch (e) {
    if (userEl) userEl.textContent = '';
  }
  const logout = document.getElementById('nav-logout');
  if (logout) {
    logout.addEventListener('click', async (ev) => {
      ev.preventDefault();
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/';
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initNav();
});
