import { $, esc, toast, confirmBox, fmtDateShort } from '../ui.js';
import { db, auth } from '../fb.js';
import { collection, doc, getDocs, deleteDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

let users = [];

export async function initUsers() {
  const table = $('#userTable');
  table.innerHTML = '<tr><td>Loading…</td></tr>';
  const snap = await getDocs(collection(db, 'users'));
  users = snap.docs.map(d => ({ ...d.data(), id: d.id }));
  users.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  if (!$('#userSearch')._wired) {
    $('#userSearch').addEventListener('input', render);
    $('#userSearch')._wired = true;
  }
  render();
}

function render() {
  const q = $('#userSearch').value.trim().toLowerCase();
  const shown = users.filter(u => !q || `${u.name} ${u.email}`.toLowerCase().includes(q));
  $('#userCount').textContent = `${shown.length} of ${users.length}`;

  const table = $('#userTable');
  table.innerHTML = `
    <thead><tr>
      <th>Name</th><th>Email</th><th>Tracker</th><th>Joined</th><th></th>
    </tr></thead>
    <tbody>
      ${shown.map(u => `
        <tr data-id="${esc(u.id)}">
          <td><strong>${esc(u.name || '—')}</strong></td>
          <td>${esc(u.email || '—')}</td>
          <td>${u.tracker ? `${u.tracker.days} days · ${fmtDateShort(u.tracker.savedOn)}` : '<span class="muted">—</span>'}</td>
          <td>${fmtDateShort(u.createdAt)}</td>
          <td><div class="actions">
            <button class="btn btn-danger btn-small" data-del="${esc(u.id)}">Delete</button>
          </div></td>
        </tr>`).join('')}
    </tbody>`;

  table.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => {
    const u = users.find(x => x.id === b.dataset.del);
    if (!confirmBox(`Delete ${u.name} (${u.email})? Their posts stay but lose the author link.`)) return;
    try {
      await deleteDoc(doc(db, 'users', u.id));
      users = users.filter(x => x.id !== u.id);
      render();
      toast('User deleted');
    } catch (err) { toast(err.message, true); }
  }));
}