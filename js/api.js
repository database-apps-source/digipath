// ============================================================================
// api.js — Inti komunikasi ke backend GAS.
// Pola wajib gas-pro-api: fetch() JSON, header text/plain untuk POST (hindari
// CORS preflight yang diblok GAS), tidak pernah google.script.run.
// Pola gas-scale-turbo: dedupe in-flight, epoch tulis, SWR cache lokal,
// penggabung batch otomatis, warmup server.
// ============================================================================
const GAS_URL = window.APP_CONFIG.GAS_URL;
if (/GANTI_DENGAN/.test(GAS_URL)) {
  console.error('⚠️ GAS_URL belum diisi di js/config.js — lihat PANDUAN_INSTALASI.md');
}

// ---- Sesi (token umur pendek, boleh di localStorage) ----------------------
const Sesi = {
  get token() { return localStorage.getItem('dp_token') || ''; },
  set token(v) { v ? localStorage.setItem('dp_token', v) : localStorage.removeItem('dp_token'); },
  get me() { try { return JSON.parse(localStorage.getItem('dp_me') || 'null'); } catch (e) { return null; } },
  set me(v) { v ? localStorage.setItem('dp_me', JSON.stringify(v)) : localStorage.removeItem('dp_me'); },
  login(token, me) { this.token = token; this.me = me; },
  logout() { this.token = ''; this.me = null; },
  get isLoggedIn() { return !!this.token && !!this.me; }
};

// ---- Dedupe baca in-flight + epoch tulis (gas-scale-turbo §4.2) -----------
const READ_ACTIONS = /^(member\.beranda|courses\.list|course\.detail|lesson\.get|admin\.dashboard|admin\.crm\.list|admin\.log\.list|admin\.lesson\.list|admin\.notif\.settings\.get|admin\.notif\.queue\.list|auth\.me|batch)$/;
const _inflight = {};
let _writeEpoch = 0;

async function apiRun_(action, data, fresh) {
  const useGet = READ_ACTIONS.test(action) && !fresh && action !== 'batch';
  try {
    let res;
    if (useGet) {
      const qs = new URLSearchParams(Object.assign({ action, token: Sesi.token }, flattenForGet_(data)));
      res = await fetch(GAS_URL + '?' + qs.toString());
    } else {
      res = await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // wajib — hindari preflight CORS
        body: JSON.stringify({ action, token: Sesi.token, data: data || {} })
      });
    }
    const json = await res.json();
    if (json.code === 'FORBIDDEN') { Sesi.logout(); location.hash = '#/masuk'; }
    return json;
  } catch (err) {
    return { success: false, message: 'Tidak dapat terhubung ke server. Periksa koneksi Anda.' };
  }
}
function flattenForGet_(data) {
  const out = {};
  Object.keys(data || {}).forEach(k => { if (typeof data[k] !== 'object') out[k] = data[k]; });
  return out;
}

async function api(action, data, opts) {
  opts = opts || {};
  if (!READ_ACTIONS.test(action)) { _writeEpoch++; return apiRun_(action, data, true); }
  const k = _writeEpoch + '|' + action + '|' + Sesi.token + '|' + JSON.stringify(data || {});
  if (_inflight[k]) return _inflight[k];
  const p = apiRun_(action, data, !!opts.fresh);
  _inflight[k] = p;
  p.then(() => delete _inflight[k], () => delete _inflight[k]);
  return p;
}

// ---- Penggabung batch otomatis (gas-scale-turbo §4.3) ----------------------
const Batcher = {
  q: null,
  add(action, data) {
    return new Promise(res => {
      if (!this.q) { this.q = []; setTimeout(() => this.flush(), 0); }
      this.q.push({ action, data: data || {}, res });
    });
  },
  async flush() {
    const batch = this.q; this.q = null;
    if (batch.length === 1) { batch[0].res(await api(batch[0].action, batch[0].data)); return; }
    const result = await api('batch', { calls: batch.map(b => ({ action: b.action, data: b.data })) });
    batch.forEach(b => b.res(result.success ? result.data[b.action] : result));
  }
};
function apiQ(action, data) { return Batcher.add(action, data); }

// ---- Stale-while-revalidate ringan (localStorage) --------------------------
const SWR = {
  render(key, onData) {
    try { const raw = localStorage.getItem('swr_' + key); if (raw) onData(JSON.parse(raw), true); } catch (e) {}
  },
  save(key, data) { try { localStorage.setItem('swr_' + key, JSON.stringify(data)); } catch (e) {} }
};

// ---- Warmup server (maks 1x/4 menit per lingkup) ---------------------------
function warmUpServer(scope) {
  const k = 'warm_' + scope, last = Number(sessionStorage.getItem(k) || 0);
  if (Date.now() - last < 240000) return;
  sessionStorage.setItem(k, String(Date.now()));
  fetch(GAS_URL + '?w=' + scope, { mode: 'no-cors' }).catch(() => {});
}

// ---- UI helpers --------------------------------------------------------
function showNotif(message, type) {
  const n = document.getElementById('notif'); if (!n) return;
  n.textContent = message; n.className = 'show' + (type ? ' ' + type : '');
  clearTimeout(n._t); n._t = setTimeout(() => n.classList.remove('show'), 3200);
}
function showLoading(show) { const el = document.getElementById('loading'); if (el) el.classList.toggle('show', !!show); }
function esc(s) { return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function fmtTanggal(iso) { if (!iso) return '-'; const d = new Date(iso); return isNaN(d) ? iso : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }); }
function fmtWaktu(iso) {
  if (!iso) return '-';
  const d = new Date(iso), diffMin = Math.round((Date.now() - d.getTime()) / 60000);
  if (diffMin < 1) return 'Baru saja';
  if (diffMin < 60) return diffMin + ' menit lalu';
  if (diffMin < 1440) return Math.round(diffMin / 60) + ' jam lalu';
  return Math.round(diffMin / 1440) + ' hari lalu';
}

// ---- Guard halaman (dipanggil di awal tiap halaman) -------------------
function requireAuth(peranDibolehkan) {
  if (!Sesi.isLoggedIn) { location.href = 'index.html'; return false; }
  if (peranDibolehkan && peranDibolehkan.indexOf(Sesi.me.peran) === -1) {
    location.href = Sesi.me.peran === 'admin' ? 'admin.html' : 'beranda.html';
    return false;
  }
  return true;
}
