import { $, esc, toast, confirmBox, fmtDate } from '../ui.js';
import { db } from '../fb.js';
import {
  collection, doc, getDocs, updateDoc, deleteDoc
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

let posts = [];
let categories = ['All'];

export async function initCommunity() {
  const listEl = $('#postList');
  listEl.innerHTML = '<div class="card">Loading…</div>';

  const snap = await getDocs(collection(db, 'posts'));
  posts = snap.docs.map(d => ({ ...d.data(), id: d.id }));
  posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const catSet = new Set(posts.map(p => p.category).filter(Boolean));
  categories = ['All', ...catSet];
  $('#postCategory').innerHTML = categories.map(c => `<option>${esc(c)}</option>`).join('');

  if (!$('#postSearch')._wired) {
    $('#postSearch').addEventListener('input', render);
    $('#postCategory').addEventListener('change', render);
    $('#postSearch')._wired = true;
  }
  render();
}

function render() {
  const q   = $('#postSearch').value.trim().toLowerCase();
  const cat = $('#postCategory').value;
  const shown = posts.filter(p => {
    if (cat !== 'All' && p.category !== cat) return false;
    if (!q) return true;
    return `${p.title} ${p.body} ${p.name} ${(p.replies || []).map(r => r.body + ' ' + r.name).join(' ')}`
      .toLowerCase().includes(q);
  });

  const listEl = $('#postList');
  if (!shown.length) { listEl.innerHTML = `<div class="card empty">No posts match this filter.</div>`; return; }

  listEl.innerHTML = shown.map(p => `
    <div class="card">
      <div class="list-item" style="border:0;padding:0">
        <div class="grow">
          <div class="meta">${esc(p.name)} · ${fmtDate(p.createdAt)} · ${esc(p.category || '')} · ${p.likes || 0} likes</div>
          <h3>${esc(p.title)}</h3>
          <p>${esc(p.body)}</p>
          <div><button class="btn btn-danger btn-small" data-del-post="${esc(p.id)}">Delete post</button></div>
        </div>
      </div>
      ${(p.replies || []).length ? `
        <div class="reply-block">
          ${p.replies.map(r => `
            <div class="reply-row">
              <div class="grow">
                <div class="meta" style="font-size:.78rem">${esc(r.name)} · ${fmtDate(r.createdAt)}</div>
                <p>${esc(r.body)}</p>
              </div>
              <button class="btn btn-danger btn-small"
                data-del-reply="${esc(r.id)}" data-post="${esc(p.id)}">Delete</button>
            </div>`).join('')}
        </div>` : ''}
    </div>`).join('');

  listEl.querySelectorAll('[data-del-post]').forEach(b => b.addEventListener('click', async () => {
    const p = posts.find(x => x.id === b.dataset.delPost);
    if (!confirmBox(`Delete the post "${p.title}" and all its replies?`)) return;
    try {
      await deleteDoc(doc(db, 'posts', p.id));
      posts = posts.filter(x => x.id !== p.id);
      render();
      toast('Post deleted');
    } catch (err) { toast(err.message, true); }
  }));

  listEl.querySelectorAll('[data-del-reply]').forEach(b => b.addEventListener('click', async () => {
    if (!confirmBox('Delete this reply?')) return;
    try {
      const p = posts.find(x => x.id === b.dataset.post);
      const replies = (p.replies || []).filter(r => r.id !== b.dataset.delReply);
      await updateDoc(doc(db, 'posts', p.id), { replies });
      p.replies = replies;
      render();
      toast('Reply deleted');
    } catch (err) { toast(err.message, true); }
  }));
}