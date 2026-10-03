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
      const [usersSnap, postsSnap, articlesSnap, placesSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'posts')),
        getDocs(collection(db, 'articles')),
        getDocs(collection(db, 'places'))
      ]);

      const strip = d => {
        const { passwordHash, ...rest } = d.data();
        return { ...rest, id: d.id };
      };

      const payload = {
        exportedAt: new Date().toISOString(),
        users:    usersSnap.docs.map(strip),
        posts:    postsSnap.docs.map(d => ({ ...d.data(), id: d.id })),
        articles: articlesSnap.docs.map(d => ({ ...d.data(), id: d.id })),
        places:   placesSnap.docs.map(d => ({ ...d.data(), id: d.id }))
      };

      download(
        `ammacare-backup-${new Date().toISOString().slice(0, 10)}.json`,
        JSON.stringify(payload, null, 2)
      );
      toast('Backup downloaded');
    } catch (err) {
      toast(err.message, true);
    } finally {
      btn.disabled = false;
    }
  });
}