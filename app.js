/* ============================================================
   Cofradía Brew · finanzas
   Datos compartidos en Supabase (Postgres + Auth).
   ============================================================ */

const CURRENCY = '$';                 // dólares. cámbialo a 'Q', '€', etc. si hace falta

/* --- 1. Pega aquí los datos de tu proyecto -----------------
   Supabase → Project Settings → API
   (la "anon public key" es pública, va en el navegador a propósito)
   ----------------------------------------------------------- */
const SUPABASE_URL = 'https://hzmyekofxdzdystkryzr.supabase.co';
const SUPABASE_KEY = 'sb_publishable_dOaiokT5DecHNp1Z1rhQ9w_zisgdT7U';

const configured = !SUPABASE_URL.includes('TU-PROYECTO');
const db = configured ? supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

let state = { inventory: [], events: [] };

/* ---------------- utilidades ---------------- */
const $ = (sel, root = document) => root.querySelector(sel);
const uid = () => crypto.randomUUID();
const round = n => Math.round(n * 100) / 100;
const num = v => Number(String(v).replace(',', '.')) || 0;
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const money = n => {
  const abs = (Math.round(Math.abs(n) * 100) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (n < 0 ? '-' : '') + CURRENCY + abs;
};
const itemById = id => state.inventory.find(i => i.id === id);

/* ---------------- base de datos ---------------- */
let loadWarned = false;

function fail(error) {
  console.error(error);
  alert('No se pudo guardar: ' + (error.message || error));
}

function loadFail(error) {
  console.error(error);
  if (loadWarned) return;
  loadWarned = true;
  alert('No se pudieron cargar los datos: ' + (error.message || error));
}

async function dbWrite(table, row) {
  const { error } = await db.from(table).upsert(row);
  if (error) fail(error);
}

async function dbRemove(table, id) {
  const { error } = await db.from(table).delete().eq('id', id);
  if (error) fail(error);
}

const saveItem  = item => dbWrite('inventory', item);
const saveEvent = ev => dbWrite('events', ev);

async function load() {
  const [inv, evs] = await Promise.all([
    db.from('inventory').select('*').order('name'),
    db.from('events').select('*').order('date', { ascending: false })
  ]);
  if (inv.error) return loadFail(inv.error);
  if (evs.error) return loadFail(evs.error);

  state.inventory = inv.data.map(i => ({ ...i, qty: Number(i.qty), cost: Number(i.cost), min: Number(i.min) }));
  state.events = evs.data.map(e => ({ ...e, price: Number(e.price), used: e.used || [], extras: e.extras || [] }));
  loadWarned = false;
}

/* ---------------- cálculos ---------------- */
function costs(ev) {
  const insumos = ev.used.reduce((s, u) => {
    const it = itemById(u.itemId);
    return s + (it ? it.cost * u.qty : 0);
  }, 0);
  const extras = ev.extras.reduce((s, x) => s + num(x.amount), 0);
  return { insumos, extras, total: insumos + extras };
}

const profit = ev => num(ev.price) - costs(ev).total;

/* ---------------- login (Supabase Auth) ---------------- */
function initLogin() {
  if (!configured) {
    $('#loginError').textContent = 'Falta configurar SUPABASE_URL y SUPABASE_KEY en app.js';
    return;
  }

  $('#loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    $('#loginError').textContent = 'Entrando…';
    const { data, error } = await db.auth.signInWithPassword({
      email: $('#loginEmail').value.trim(),
      password: $('#loginPin').value
    });
    if (error) {
      $('#loginError').textContent = 'Correo o contraseña incorrectos';
      $('#loginPin').value = '';
      return;
    }
    boot(data.user);
  });

  db.auth.onAuthStateChange((_event, session) => { if (!session) location.reload(); });

  db.auth.getSession().then(({ data }) => { if (data.session) boot(data.session.user); });
}

async function boot(user) {
  $('#login').hidden = true;
  $('#app').hidden = false;
  $('#who').textContent = user.user_metadata?.name || user.email.split('@')[0];
  await load();
  renderAll();
}

async function refresh() {
  if ($('#app').hidden) return;
  await load();
  renderAll();
}

/* al volver a la app, jala los cambios de los otros usuarios */
window.addEventListener('focus', refresh);
document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });

/* ---------------- navegación ---------------- */
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t === tab));
    document.querySelectorAll('.view').forEach(v => { v.hidden = v.id !== tab.dataset.tab; });
    refresh();
  });
});

function renderAll() {
  renderResumen();
  renderInventory();
  renderEvents();
}

/* ---------------- resumen ---------------- */
function renderResumen() {
  const ingresos = state.events.reduce((s, e) => s + num(e.price), 0);
  const gastos = state.events.reduce((s, e) => s + costs(e).total, 0);
  const ganancia = ingresos - gastos;

  $('#cards').innerHTML = `
    <div class="kpi"><span>Eventos</span><strong>${state.events.length}</strong></div>
    <div class="kpi"><span>Ingresos</span><strong>${money(ingresos)}</strong></div>
    <div class="kpi red"><span>Gastos</span><strong>${money(gastos)}</strong></div>
    <div class="kpi green"><span>Ganancia</span><strong>${money(ganancia)}</strong></div>`;

  const low = state.inventory.filter(i => i.qty <= i.min);
  $('#lowStock').innerHTML = low.length
    ? low.map(i => `<span class="pill">${esc(i.name)}: ${i.qty} ${esc(i.unit)} (mín ${i.min})</span>`).join('')
    : '<p class="muted small">Todo el inventario está por encima del mínimo.</p>';

  const rows = [...state.events].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  $('#resumenEventos').innerHTML = rows.length
    ? rows.map(e => {
        const g = profit(e);
        return `<tr>
          <td>${esc(e.name)}</td>
          <td>${esc(e.date)}</td>
          <td class="num">${money(num(e.price))}</td>
          <td class="num">${money(costs(e).total)}</td>
          <td class="num" style="color:${g >= 0 ? 'var(--matcha)' : 'var(--danger)'}">${money(g)}</td>
        </tr>`;
      }).join('')
    : '<tr><td colspan="5" class="muted">Sin eventos todavía.</td></tr>';
}

/* ---------------- inventario ---------------- */
function renderInventory() {
  const cats = ['Café', 'Leche', 'Matcha', 'Syrup', 'Otro'];
  $('#invTable tbody').innerHTML = state.inventory.map(i => `
    <tr>
      <td><input data-id="${i.id}" data-field="name" value="${esc(i.name)}"></td>
      <td>
        <select data-id="${i.id}" data-field="cat">
          ${cats.map(c => `<option ${c === i.cat ? 'selected' : ''}>${c}</option>`).join('')}
        </select>
      </td>
      <td><input data-id="${i.id}" data-field="unit" value="${esc(i.unit)}" size="4"></td>
      <td class="num"><input class="w-num" type="number" step="0.01" data-id="${i.id}" data-field="qty" value="${i.qty}"></td>
      <td class="num"><input class="w-num" type="number" step="0.01" data-id="${i.id}" data-field="min" value="${i.min}"></td>
      <td class="num"><input class="w-num" type="number" step="0.01" data-id="${i.id}" data-field="cost" value="${i.cost}"></td>
      <td><button class="btn small danger" data-del-item="${i.id}" type="button">✕</button></td>
    </tr>`).join('');
}

$('#invForm').addEventListener('submit', e => {
  e.preventDefault();
  const f = new FormData(e.target);
  const item = {
    id: uid(),
    name: (f.get('name') || '').trim(),
    cat: f.get('cat'),
    unit: (f.get('unit') || 'u').trim(),
    qty: num(f.get('qty')),
    cost: num(f.get('cost')),
    min: num(f.get('min'))
  };
  state.inventory.push(item);
  saveItem(item);
  e.target.reset(); $('[name=unit]', e.target).value = 'g';
  renderAll();
});

$('#invTable').addEventListener('change', e => {
  const el = e.target;
  const item = itemById(el.dataset.id);
  if (!item) return;
  const field = el.dataset.field;
  item[field] = field === 'name' || field === 'unit' || field === 'cat' ? el.value : round(num(el.value));
  saveItem(item);
  renderAll();
});

$('#invTable').addEventListener('click', e => {
  const id = e.target.dataset.delItem;
  if (!id) return;
  const item = itemById(id);
  if (!confirm(`¿Borrar "${item.name}"? Los eventos que lo usan perderán ese costo.`)) return;
  state.inventory = state.inventory.filter(i => i.id !== id);
  dbRemove('inventory', id);
  renderAll();
});

/* ---------------- eventos ---------------- */
$('#eventForm').addEventListener('submit', e => {
  e.preventDefault();
  const f = new FormData(e.target);
  const ev = {
    id: uid(),
    name: (f.get('name') || '').trim(),
    date: f.get('date'),
    place: (f.get('place') || '').trim(),
    price: num(f.get('price')),
    used: [],
    extras: []
  };
  state.events.push(ev);
  saveEvent(ev);
  e.target.reset();
  renderAll();
});

function renderEvents() {
  const opts = state.inventory.map(i => `<option value="${i.id}">${esc(i.name)} (${i.qty} ${esc(i.unit)})</option>`).join('');
  const list = [...state.events].sort((a, b) => String(b.date).localeCompare(String(a.date)));

  $('#events').innerHTML = list.length ? list.map(ev => {
    const c = costs(ev);
    const p = num(ev.price) - c.total;

    const usedRows = ev.used.map((u, idx) => {
      const it = itemById(u.itemId);
      const line = it ? it.cost * u.qty : 0;
      return `<tr>
        <td>${it ? esc(it.name) : '<em class="muted">insumo borrado</em>'}</td>
        <td class="num">${u.qty} ${it ? esc(it.unit) : ''}</td>
        <td class="num">${money(line)}</td>
        <td><button class="btn small" data-del-used="${idx}" data-ev="${ev.id}" type="button">✕</button></td>
      </tr>`;
    }).join('');

    const extraPills = ev.extras.map((x, idx) =>
      `<span class="pill">${esc(x.label)} · ${money(num(x.amount))}
        <button data-del-extra="${idx}" data-ev="${ev.id}" type="button">✕</button></span>`).join('');

    return `<article class="event">
      <div class="event-head">
        <div>
          <strong>${esc(ev.name)}</strong>
          <div class="muted small">${esc(ev.date)}${ev.place ? ' · ' + esc(ev.place) : ''}</div>
        </div>
        <div class="sum" style="min-width:170px">
          <div><span class="muted">Cobro</span><span>${money(num(ev.price))}</span></div>
          <div><span class="muted">Gasto</span><span>${money(c.total)}</span></div>
          <div class="total"><span>Ganancia</span><span class="${p >= 0 ? 'profit' : 'loss'}">${money(p)}</span></div>
        </div>
      </div>

      <div class="event-grid">
        <div>
          <h2 style="margin-top:0">Insumos usados</h2>
          <form class="mini-form" data-ev="${ev.id}" data-kind="used">
            <select name="itemId" required>${opts}</select>
            <input name="qty" type="number" step="0.01" min="0" placeholder="Cant." required>
            <button class="btn small primary" type="submit">+</button>
          </form>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Insumo</th><th class="num">Cant.</th><th class="num">Costo</th><th></th></tr></thead>
              <tbody>${usedRows || '<tr><td colspan="4" class="muted">Sin insumos.</td></tr>'}</tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 style="margin-top:0">Gastos extra</h2>
          <form class="mini-form" data-ev="${ev.id}" data-kind="extra">
            <input name="label" placeholder="Transporte, hielo, personal…" required>
            <input name="amount" type="number" step="0.01" min="0" placeholder="Monto" required>
            <button class="btn small primary" type="submit">+</button>
          </form>
          <div>${extraPills || '<p class="muted small">Sin gastos extra.</p>'}</div>
          <button class="btn small danger" data-del-event="${ev.id}" type="button" style="margin-top:10px">Borrar evento</button>
        </div>
      </div>
    </article>`;
  }).join('') : '<p class="empty">Aún no hay eventos. Crea el primero arriba.</p>';
}

/* formularios dentro de la tarjeta de evento */
$('#events').addEventListener('submit', e => {
  e.preventDefault();
  const ev = state.events.find(x => x.id === e.target.dataset.ev);
  if (!ev) return;
  const f = new FormData(e.target);

  if (e.target.dataset.kind === 'used') {
    const item = itemById(f.get('itemId'));
    const qty = round(num(f.get('qty')));
    if (!item || qty <= 0) return;
    if (qty > item.qty && !confirm(`Solo hay ${item.qty} ${item.unit} de ${item.name}. ¿Registrar igual?`)) return;
    item.qty = round(item.qty - qty);
    ev.used.push({ itemId: item.id, qty });
    saveItem(item);
  } else {
    ev.extras.push({ label: (f.get('label') || 'Gasto').trim(), amount: round(num(f.get('amount'))) });
  }
  saveEvent(ev);
  renderAll();
});

$('#events').addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b) return;
  const ev = state.events.find(x => x.id === b.dataset.ev);

  if (b.dataset.delUsed !== undefined && ev) {
    const idx = Number(b.dataset.delUsed);
    const u = ev.used[idx];
    const item = itemById(u.itemId);
    if (item) { item.qty = round(item.qty + u.qty); saveItem(item); } // devuelve stock
    ev.used.splice(idx, 1);
    saveEvent(ev);
  } else if (b.dataset.delExtra !== undefined && ev) {
    ev.extras.splice(Number(b.dataset.delExtra), 1);
    saveEvent(ev);
  } else if (b.dataset.delEvent) {
    const target = state.events.find(x => x.id === b.dataset.delEvent);
    if (!target) return;
    if (!confirm(`¿Borrar "${target.name}"? Se devuelve el stock de sus insumos.`)) return;
    target.used.forEach(u => {
      const item = itemById(u.itemId);
      if (item) { item.qty = round(item.qty + u.qty); saveItem(item); }
    });
    state.events = state.events.filter(x => x.id !== target.id);
    dbRemove('events', target.id);
  } else {
    return;
  }
  renderAll();
});

/* ---------------- datos / respaldo ---------------- */
$('#refreshBtn').addEventListener('click', refresh);

$('#logoutBtn').addEventListener('click', async () => {
  await db.auth.signOut();
  location.reload();
});

$('#exportBtn').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `cofradia-brew-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  $('#dataMsg').textContent = 'Respaldo descargado.';
});

$('#importFile').addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!Array.isArray(data.inventory) || !Array.isArray(data.events)) throw new Error('formato');
    if (!confirm('Esto reemplaza el inventario y los eventos de TODOS los usuarios. ¿Continuar?')) return;

    // ids nuevos, remapeando los insumos usados por los eventos
    const map = new Map();
    const items = data.inventory.map(i => {
      const id = uid();
      map.set(i.id, id);
      return { id, name: String(i.name || 'Insumo'), cat: i.cat || 'Otro', unit: i.unit || 'u', qty: num(i.qty), cost: num(i.cost), min: num(i.min) };
    });
    const events = data.events.map(ev => ({
      id: uid(),
      name: String(ev.name || 'Evento'),
      date: ev.date,
      place: ev.place || '',
      price: num(ev.price),
      used: (ev.used || []).map(u => ({ itemId: map.get(u.itemId) || u.itemId, qty: num(u.qty) })),
      extras: (ev.extras || []).map(x => ({ label: String(x.label || 'Gasto'), amount: num(x.amount) }))
    }));

    await db.from('events').delete().not('id', 'is', null);
    await db.from('inventory').delete().not('id', 'is', null);
    if (items.length) await db.from('inventory').insert(items);
    if (events.length) await db.from('events').insert(events);

    await refresh();
    $('#dataMsg').textContent = 'Datos importados.';
  } catch {
    alert('Archivo inválido: debe ser un JSON exportado por esta app.');
  }
  e.target.value = '';
});

$('#resetBtn').addEventListener('click', async () => {
  if (!confirm('Esto borra inventario y eventos de TODOS los usuarios. ¿Seguro?')) return;
  await db.from('events').delete().not('id', 'is', null);
  await db.from('inventory').delete().not('id', 'is', null);
  await refresh();
  $('#dataMsg').textContent = 'Base de datos vacía.';
});

/* arranque */
initLogin();
