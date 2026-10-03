import { $, esc, toast } from '../ui.js';
import { db } from '../fb.js';
import {
  collection, doc, getDocs, setDoc
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

let data = { specialties: {}, places: {} };

export async function initPlaces() {
  const el = $('#placesList');
  el.innerHTML = '<div class="card">Loading…</div>';
  const snap = await getDocs(collection(db, 'places'));
  data = { specialties: {}, places: {} };
  snap.forEach(d => {
    const x = d.data();
    data.specialties[d.id] = { title: x.title || '', detail: x.detail || '' };
    data.places[d.id]      = x.places || [];
  });
  render();
}

function render() {
  const el = $('#placesList');
  const keys = Object.keys(data.specialties);
  if (!keys.length) {
    el.innerHTML = `<div class="card empty">No specialties found. Run the migration or add one below.</div>`;
    return;
  }
  el.innerHTML = keys.map(key => {
    const s = data.specialties[key];
    return `
      <div class="card" data-key="${esc(key)}">
        <span class="mono-label accent">${esc(key)}</span>
        <div class="editor-grid" style="margin-top:.6rem">
          <label class="field"><span class="mono-label">Title</span>
            <input data-field="title" value="${esc(s.title)}">
          </label>
          <label class="field" style="grid-column:span 2"><span class="mono-label">Detail</span>
            <input data-field="detail" value="${esc(s.detail)}">
          </label>
        </div>
        <span class="mono-label">Places</span>
        <div data-places style="margin-top:.5rem"></div>
        <div class="editor-actions" style="justify-content:flex-start">
          <button class="btn btn-outline btn-small" data-add>+ Add place</button>
          <button class="btn btn-primary btn-small" data-save>Save changes</button>
        </div>
      </div>`;
  }).join('');

  el.querySelectorAll('.card').forEach(card => {
    const key = card.dataset.key;
    const box = card.querySelector('[data-places]');
    const draw = () => {
      box.innerHTML = (data.places[key] || []).map((p, i) => `
        <div class="editor-grid" style="grid-template-columns:2fr 2fr 1fr auto;gap:.5rem;margin-bottom:.5rem">
          <input data-i="${i}" data-f="name"   value="${esc(p.name || '')}"   placeholder="Name">
          <input data-i="${i}" data-f="detail" value="${esc(p.detail || '')}" placeholder="Detail">
          <input data-i="${i}" data-f="place"  value="${esc(p.place || '')}"  placeholder="Place">
          <button class="btn btn-icon" data-del="${i}" aria-label="Remove place">×</button>
        </div>`).join('') || '<p class="muted" style="margin:.3rem 0">No places yet.</p>';
      box.querySelectorAll('input[data-i]').forEach(inp => inp.addEventListener('input', () => {
        data.places[key][Number(inp.dataset.i)][inp.dataset.f] = inp.value;
      }));
      box.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
        data.places[key].splice(Number(b.dataset.del), 1);
        draw();
      }));
    };
    draw();

    card.querySelector('[data-add]').addEventListener('click', () => {
      data.places[key] = data.places[key] || [];
      data.places[key].push({ name: '', detail: '', place: '' });
      draw();
    });

    card.querySelector('[data-save]').addEventListener('click', async () => {
      try {
        const title  = card.querySelector('[data-field="title"]').value;
        const detail = card.querySelector('[data-field="detail"]').value;
        await setDoc(doc(db, 'places', key), {
          title, detail, places: data.places[key]
        }, { merge: true });
        data.specialties[key] = { title, detail };
        toast('Saved');
      } catch (err) { toast(err.message, true); }
    });
  });
}