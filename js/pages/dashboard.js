import { $, esc, fmtDate } from '../ui.js';
import { db } from '../fb.js';
import { collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

export async function initDashboard() {
  const grid   = $('#statGrid');
  const recent = $('#recentCard');
  grid.innerHTML = '<div class="card">Loading…</div>';
  recent.innerHTML = '';

  const [usersSnap, postsSnap, articlesSnap] = await Promise.all([
    getDocs(collection(db, 'users')),
    getDocs(collection(db, 'posts')),
    getDocs(collection(db, 'articles'))
  ]);

  let replies = 0, likes = 0, recentUsers = 0, recentPosts = 0;
  const weekAgo = Date.now() - 7 * 86400000;

  const users = usersSnap.docs.map(d => ({ ...d.data(), id: d.id }));
  const posts = postsSnap.docs.map(d => {
    const p = d.data();
    replies += (p.replies || []).length;
    likes   += (p.likes   || 0);
    if (new Date(p.createdAt || 0).getTime() > weekAgo) recentPosts++;
    return { ...p, id: d.id };
  });
  users.forEach(u => {
    if (new Date(u.createdAt || 0).getTime() > weekAgo) recentUsers++;
  });

  grid.innerHTML = `
    <div class="stat-card accent-terracotta"><span class="mono-label">Users</span><strong>${users.length}</strong><small>${recentUsers} new this week</small></div>
    <div class="stat-card accent-forest"><span class="mono-label">Posts</span><strong>${posts.length}</strong><small>${recentPosts} this week</small></div>
    <div class="stat-card accent-mustard"><span class="mono-label">Replies</span><strong>${replies}</strong><small>${likes} likes given</small></div>
    <div class="stat-card"><span class="mono-label">Articles</span><strong>${articlesSnap.size}</strong><small>Live on the site</small></div>`;

  const recentP = posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
  const recentU = users.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);

  recent.innerHTML = `
    <span class="mono-label accent">Latest activity</span>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;margin-top:1rem">
      <div>
        <h3>Recent posts</h3>
        ${recentP.length ? recentP.map(p => `
          <div style="padding:.6rem 0;border-top:1px solid var(--line)">
            <strong>${esc(p.title)}</strong>
            <div class="muted" style="font-size:.82rem">${esc(p.name)} · ${fmtDate(p.createdAt)}</div>
          </div>`).join('') : '<p class="muted">No posts yet.</p>'}
      </div>
      <div>
        <h3>New users</h3>
        ${recentU.length ? recentU.map(u => `
          <div style="padding:.6rem 0;border-top:1px solid var(--line)">
            <strong>${esc(u.name)}</strong>
            <div class="muted" style="font-size:.82rem">${esc(u.email)} · ${fmtDate(u.createdAt)}</div>
          </div>`).join('') : '<p class="muted">No users yet.</p>'}
      </div>
    </div>`;
}