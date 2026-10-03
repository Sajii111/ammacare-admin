import { $, toast, download } from '../ui.js';
import { db } from '../fb.js';
import { collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

export async function initExport() {
  if ($('#exportBtn')._wired) return;
  $('#exportBtn')._wired = true;
  $('#exportBtn').addEventListener('click', async () => {
    const btn = $('#exportBtn');
    btn.disabled = true;
    try {
      const [users, posts, articles, places, admins] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'posts')),
        getDocs(collection(db, 'articles')),
        getDocs(collection(db, 'places')),
        getDocs(collection(db, 'admins'))
      ]);
      const strip = d => { const { passwordHash, ...rest } = d.data(); return { ...rest, id: d.id }; };
      const payload = {
        exportedAt: new Date().toISOString(),
        users:    users.docs.map(strip),
        posts:    posts.docs.map(d => ({ ...d.data(), id: d.id })),
        articles: articles.docs.map(d => ({ ...d.data(), id: d.id })),
        places:   places.docs.map(d => ({ ...d.data(), id: d.id })),
        admins:   admins.docs.map(d => ({ ...d.data(), id: d.id }))
      };
      download(`ammacare-backup-${new Date().toISOString().slice(0, 10)}.json`,
        JSON.stringify(payload, null, 2));
      toast('Backup downloaded');
    } catch (err) {
      toast(err.message, true);
    } finally { btn.disabled = false; }
  });
}