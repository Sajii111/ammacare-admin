// js/main.js — router + boot.
import { $, $$, toast } from './ui.js';
import { authState, whenReady, signOutNow, signIn, isAdmin } from './auth.js';
import { PUBLIC_SITE_URL } from '../firebase-config.js';
import { initDashboard } from './pages/dashboard.js';
import { initArticles } from './pages/articles.js';
import { initCommunity } from './pages/community.js';
import { initUsers } from './pages/users.js';
import { initPlaces } from './pages/places.js';
import { initExport } from './pages/export.js';

const PAGES = {
  dashboard: initDashboard,
  articles:  initArticles,
  community: initCommunity,
  users:     initUsers,
  places:    initPlaces,
  export:    initExport
};

/* ---------- header account area ---------- */
function renderAccount() {
  const area = $('#accountArea');
  if (!authState.user) {
    area.innerHTML = `<button type="button" class="btn btn-primary btn-small" data-auth>Sign in</button>`;
    return;
  }
  const email = authState.user.email || '';
  const name  = email.split('@')[0];
  const initials = name.slice(0, 2).toUpperCase();
  area.innerHTML = `
    <button type="button" class="account-btn" id="accountBtn" aria-haspopup="true" aria-expanded="false">
      <span class="avatar small" aria-hidden="true">${initials}</span>
      <span>${name}</span>
    </button>
    <div class="account-menu hidden" id="accountMenu">
      <strong>${email}</strong>
      <hr>
      <button type="button" id="signOutBtn">Sign out</button>
    </div>`;
}

/* ---------- router ---------- */
async function route() {
  await whenReady();

  if (!isAdmin()) {
    $$('.page').forEach(s => s.classList.toggle('active', s.dataset.page === 'gate'));
    $$('.admin-nav a').forEach(a => a.classList.remove('active'));
    document.body.classList.remove('nav-open');
    return;
  }

  const name = location.hash.slice(1);
  const page = name in PAGES ? name : 'dashboard';
  $$('.page').forEach(s => s.classList.toggle('active', s.dataset.page === page));
  $$('.admin-nav a').forEach(a => a.classList.toggle('active', a.dataset.page === page));
  document.body.classList.remove('nav-open');
  $('.nav-toggle').setAttribute('aria-expanded', 'false');
  window.scrollTo({ top: 0 });

  const init = PAGES[page];
  if (init) {
    try { await init(); }
    catch (err) { console.error('page error', err); toast(err.message, true); }
  }
}

/* ---------- auth dialog ---------- */
function openAuth() {
  const d = $('#authDialog');
  $('#authError').innerHTML = '';
  if (!d.open) d.showModal();
  setTimeout(() => $('#authEmail').focus(), 50);
}

/* ---------- events ---------- */
function wireGlobalEvents() {
  document.addEventListener('click', e => {
    if (e.target.closest('[data-auth]')) { e.preventDefault(); openAuth(); return; }
    const accBtn = e.target.closest('#accountBtn');
    const menu   = $('#accountMenu');
    if (accBtn && menu) {
      const open = menu.classList.toggle('hidden') === false;
      accBtn.setAttribute('aria-expanded', String(open));
      return;
    }
    if (e.target.closest('#signOutBtn')) {
      signOutNow().then(() => toast('Signed out'));
      return;
    }
    if (menu && !e.target.closest('#accountMenu')) menu.classList.add('hidden');
  });

  $('.nav-toggle').addEventListener('click', () => {
    const open = document.body.classList.toggle('nav-open');
    $('.nav-toggle').setAttribute('aria-expanded', String(open));
  });

  const d = $('#authDialog');
  d.querySelector('.dialog-close').addEventListener('click', () => d.close());
  d.addEventListener('click', e => { if (e.target === d) d.close(); });

  $('#authForm').addEventListener('submit', async e => {
    e.preventDefault();
    const btn    = $('#authSubmit');
    const errBox = $('#authError');
    errBox.innerHTML = '';
    btn.disabled = true;
    try {
      await signIn($('#authEmail').value, $('#authPassword').value);
      d.close();
      $('#authForm').reset();
      toast('Welcome back');
    } catch (err) {
      // Firebase returns verbose codes; give a friendlier message
      const msg = /invalid-credential|wrong-password|user-not-found/i.test(err.message)
        ? 'The email or password is not correct.'
        : /too-many-requests/i.test(err.message)
          ? 'Too many attempts. Please wait a few minutes and try again.'
          : err.message;
      errBox.innerHTML = `<div class="alert alert-error">${msg}</div>`;
    } finally {
      btn.disabled = false;
    }
  });

  const link = $('#viewSiteLink');
  if (PUBLIC_SITE_URL) link.href = PUBLIC_SITE_URL;
  else { link.textContent = 'Set PUBLIC_SITE_URL in firebase-config.js'; link.href = '#'; }
}

/* ---------- boot ---------- */
wireGlobalEvents();
window.addEventListener('hashchange', route);
window.addEventListener('authchange', () => {
  renderAccount();
  route();
});

renderAccount();
route();