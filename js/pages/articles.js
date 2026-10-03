import { $, esc, toast, confirmBox, slugify } from '../ui.js';
import { db } from '../fb.js';
import {
  collection, doc, getDocs, setDoc, deleteDoc, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { PUBLIC_SITE_URL } from '../../firebase-config.js';

let articles = [];
let editing  = null;

/* ---------- sorting: newest first ---------- */
function toMs(t) {
  if (!t) return 0;
  if (typeof t === 'number') return t;
  if (typeof t === 'string') return new Date(t).getTime() || 0;
  if (typeof t.seconds === 'number') return t.seconds * 1000;
  return 0;
}
function sortArticles(list) {
  return list.sort((a, b) => {
    const at = toMs(a.createdAt) || toMs(a.updatedAt);
    const bt = toMs(b.createdAt) || toMs(b.updatedAt);
    return bt - at;
  });
}

/* ---------- page entry ---------- */
export async function initArticles() {
  const listEl = $('#articleList');
  listEl.innerHTML = '<div class="card">Loading…</div>';

  const snap = await getDocs(collection(db, 'articles'));
  articles = snap.docs.map(d => ({ ...d.data(), id: d.id }));
  sortArticles(articles);

  if (!$('#newArticleBtn')._wired) {
    $('#newArticleBtn').addEventListener('click', () => openEditor(null));
    $('#articleSearch').addEventListener('input', render);
    $('#articleForm').addEventListener('submit', submit);
    $('#articleCancel').addEventListener('click', closeEditor);
    $('#articleDialog').querySelector('.dialog-close').addEventListener('click', closeEditor);
    $('#articleDialog').addEventListener('click', e => {
      if (e.target === $('#articleDialog')) closeEditor();
    });
    $('#seedArticlesBtn').addEventListener('click', seed);
    $('#newArticleBtn')._wired = true;
  }
  render();
}

/* ---------- list ---------- */
function render() {
  const q = $('#articleSearch').value.trim().toLowerCase();
  const shown = articles.filter(a =>
    !q || `${a.title} ${a.summary} ${(a.tags || []).join(' ')}`.toLowerCase().includes(q));

  const listEl = $('#articleList');
  if (!shown.length) {
    listEl.innerHTML = `<div class="card empty">${
      q ? 'No articles match your search.'
        : 'No articles yet. Create the first one, or import from articles.json.'
    }</div>`;
    return;
  }

  listEl.innerHTML = `<div class="card">${shown.map(a => `
    <div class="list-item">
      <div class="grow">
        <h3>${esc(a.title)}</h3>
        <div class="meta">${esc(a.category || '')} · ${a.readMins || 3} min · id: ${esc(a.id)}</div>
        <p>${esc(a.summary || '')}</p>
        <div>${(a.tags || []).map(t => `<span class="tag">${esc(t)}</span>`).join(' ')}</div>
        ${a.image ? `<div class="meta" style="margin-top:.4rem">photo: ${esc(a.image)}</div>` : ''}
      </div>
      <div class="actions">
        <button class="btn btn-outline btn-small" data-edit="${esc(a.id)}">Edit</button>
        <button class="btn btn-danger btn-small" data-del="${esc(a.id)}">Delete</button>
      </div>
    </div>`).join('')}</div>`;

  listEl.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () =>
    openEditor(articles.find(a => a.id === b.dataset.edit))));

  listEl.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => {
    const a = articles.find(x => x.id === b.dataset.del);
    if (!confirmBox(`Delete "${a.title}"? This cannot be undone.`)) return;
    try {
      await deleteDoc(doc(db, 'articles', a.id));
      articles = articles.filter(x => x.id !== a.id);
      render();
      toast('Article deleted');
    } catch (err) { toast(err.message, true); }
  }));
}

/* ---------- editor ---------- */
function openEditor(article) {
  editing = article;
  $('#articleDialogLabel').textContent = article ? 'Edit article' : 'New article';
  $('#articleDialogTitle').textContent = article ? `Editing: ${article.title}` : 'Write a new article';
  $('#aTitle').value     = article?.title || '';
  $('#aCategory').value  = article?.category || 'Pregnancy';
  $('#aReadMins').value  = article?.readMins || 3;
  $('#aId').value        = article?.id || '';
  $('#aId').disabled     = Boolean(article);
  $('#aTags').value      = (article?.tags || []).join(', ');
  $('#aSummary').value   = article?.summary || '';
  $('#aBody').value      = (article?.body || []).join('\n\n');
  $('#aImage').value     = article?.image || '';
  $('#articleError').innerHTML = '';
  $('#articleDialog').showModal();
}
function closeEditor() {
  $('#articleDialog').close();
  editing = null;
}

/* ---------- save ---------- */
async function submit(e) {
  e.preventDefault();
  const errBox = $('#articleError');
  errBox.innerHTML = '';
  const btn = $('#articleSave');
  btn.disabled = true;

  const wasEditing = Boolean(editing);
  try {
    const title  = $('#aTitle').value.trim();
    const id     = editing?.id || $('#aId').value.trim() || slugify(title);
    const image  = $('#aImage').value.trim();

    const payload = {
      title,
      category: $('#aCategory').value,
      readMins: Number($('#aReadMins').value) || 3,
      tags:     $('#aTags').value.split(',').map(s => s.trim()).filter(Boolean),
      summary:  $('#aSummary').value.trim(),
      body:     $('#aBody').value.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean),
      image:    image || null,          // null clears the field
      updatedAt: serverTimestamp()
    };
    if (!wasEditing) payload.createdAt = serverTimestamp();

    await setDoc(doc(db, 'articles', id), payload, { merge: true });

    closeEditor();
    await initArticles();
    toast(wasEditing ? 'Article updated' : 'Article created');
  } catch (err) {
    errBox.innerHTML = `<div class="alert alert-error">${esc(err.message)}</div>`;
  } finally {
    btn.disabled = false;
  }
}

/* ---------- seed ---------- */
async function seed() {
  const url = PUBLIC_SITE_URL ? PUBLIC_SITE_URL.replace(/\/$/, '') + '/data/articles.json' : '';
  const input = prompt(
    'URL of articles.json to import from:',
    url || 'https://your-site.example/data/articles.json'
  );
  if (!input) return;

  try {
    const res = await fetch(input, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('Expected a JSON array.');

    for (const a of data) {
      if (!a.id || !a.title) continue;
      await setDoc(doc(db, 'articles', a.id), a, { merge: true });
    }
    toast(`Imported ${data.length} article(s)`);
    await initArticles();
  } catch (err) {
    toast('Import failed: ' + err.message, true);
  }
}