// ============================================================================
// admin-broadcast.js — Otomasi Pesan & Follow-Up (tab "Broadcast & Antrean")
// ============================================================================
let _broadcastInit = false;

async function initBroadcast() {
  const el = document.getElementById('view-broadcast');
  if (!_broadcastInit) {
    el.innerHTML = `
      <h1 style="font-size:24px; margin:0 0 .25rem;">Otomasi Pesan &amp; Follow-Up Member</h1>
      <p class="text-muted text-sm">Kirim pesan berkala via WhatsApp (Fonnte) &amp; Gmail untuk meningkatkan completion rate dan retensi.</p>

      <div class="kpi-grid mt-3" style="grid-template-columns:repeat(3,1fr);">
        <div class="kpi-card"><div class="label">Pesan Terkirim</div><div class="value" id="bcTerkirim">0</div><div class="delta text-muted" style="color:var(--text-muted)">Total sepanjang waktu</div></div>
        <div class="kpi-card"><div class="label">Menunggu Diproses</div><div class="value" id="bcMenunggu">0</div><div class="delta text-muted" style="color:var(--text-muted)">Diproses tiap 1 menit</div></div>
        <div class="kpi-card"><div class="label">Gagal Kirim</div><div class="value" id="bcGagal" style="color:var(--danger)">0</div><div class="delta text-muted" style="color:var(--text-muted)">Cek nomor/token</div></div>
      </div>

      <div class="grid-2 mt-3">
        <div class="card">
          <div class="flex justify-between items-center">
            <h3 style="font-size:15px; margin:0;">⚙️ Konfigurasi Gateway</h3>
          </div>
          <div class="field mt-2"><label>Status Token Fonnte</label>
            <div class="flex items-center gap-1"><span class="pill" id="fonnteStatusPill">—</span><span class="text-sm text-muted" id="fonnteSamar"></span></div>
          </div>
          <div class="field"><label>Token Fonnte (API Key)</label>
            <input class="input" type="password" id="fonnteTokenInput" placeholder="Masukkan token baru untuk mengganti...">
          </div>
          <button class="btn btn-secondary btn-sm" onclick="simpanFonnteToken()">Simpan Token</button>

          <div class="mt-3" style="border-top:1px solid var(--border-subtle); padding-top:1rem;">
            <label class="flex items-center gap-1"><input type="checkbox" id="swUtama"> Saklar Utama Notifikasi</label>
            <label class="flex items-center gap-1 mt-1"><input type="checkbox" id="swWa"> Kanal WhatsApp Aktif</label>
            <label class="flex items-center gap-1 mt-1"><input type="checkbox" id="swEmail"> Kanal Email Aktif</label>
            <button class="btn btn-secondary btn-sm mt-2" onclick="simpanSaklarNotif()">Simpan Pengaturan</button>
          </div>
        </div>

        <div class="card">
          <h3 style="font-size:15px; margin:0 0 .75rem;">📣 Buat Blast Baru</h3>
          <div class="field"><label>Target Segmen</label>
            <select class="input" id="blastSegmen">
              <option value="semua">Semua Member</option>
              <option value="Lead Baru">Lead Baru</option>
              <option value="Hot / Follow-up">Hot / Follow-up (Pasif &gt;7 hari)</option>
              <option value="Enrolled Paid">Enrolled Paid</option>
            </select>
          </div>
          <div class="field"><label>Kanal</label>
            <select class="input" id="blastKanal"><option value="WA">WhatsApp</option><option value="Email">Email</option></select>
          </div>
          <div class="field" id="subjekWrap style=display:none"><label>Subjek (khusus Email)</label><input class="input" id="blastSubjek" placeholder="Subjek pesan"></div>
          <div class="field"><label>Isi Pesan — gunakan <code>{nama}</code> untuk personalisasi</label>
            <textarea class="input" id="blastPesan" placeholder="Halo {nama}! Yuk lanjutkan belajarmu hari ini 🚀"></textarea>
          </div>
          <div class="field"><label>Ukuran Batch (anti-banned WA)</label>
            <select class="input" id="blastBatch"><option value="10">10 pesan/putaran</option><option value="20" selected>20 pesan/putaran</option><option value="50">50 pesan/putaran</option></select>
          </div>
          <button class="btn btn-primary btn-block" onclick="jadwalkanBlast()">🚀 Jadwalkan ke Antrean</button>
        </div>
      </div>

      <div class="card mt-3">
        <div class="flex justify-between items-center">
          <h3 style="font-size:15px; margin:0;">Antrean &amp; Riwayat Pengiriman</h3>
          <button class="btn btn-secondary btn-sm" onclick="prosesAntreanManual()">▶ Proses Antrean Sekarang</button>
        </div>
        <div class="table-wrap mt-2"><table class="data-table">
          <thead><tr><th>Target</th><th>Kanal</th><th>Pesan</th><th>Jadwal</th><th>Status</th></tr></thead>
          <tbody id="antreanTable"></tbody>
        </table></div>
      </div>`;
    _broadcastInit = true;
  }
  await muatSettingsNotif();
  await muatAntrean();
}

async function muatSettingsNotif() {
  const res = await api('admin.notif.settings.get');
  if (!res.success) return;
  const d = res.data;
  document.getElementById('swUtama').checked = d.aktifUtama;
  document.getElementById('swWa').checked = d.waAktif;
  document.getElementById('swEmail').checked = d.emailAktif;
  document.getElementById('fonnteStatusPill').className = 'pill ' + (d.fonnteTokenAda ? 'pill-enrolled' : 'pill-hot');
  document.getElementById('fonnteStatusPill').textContent = d.fonnteTokenAda ? 'Terhubung' : 'Belum Dikonfigurasi';
  document.getElementById('fonnteSamar').textContent = d.fonnteTokenAda ? d.fonnteTokenSamar : '';
}
async function simpanFonnteToken() {
  const v = document.getElementById('fonnteTokenInput').value.trim();
  if (!v) return showNotif('Masukkan token terlebih dahulu.', 'error');
  const res = await api('admin.notif.secret.save', { kunci: 'FONNTE_TOKEN', nilai: v });
  showNotif(res.message, res.success ? 'success' : 'error');
  if (res.success) { document.getElementById('fonnteTokenInput').value = ''; muatSettingsNotif(); }
}
async function simpanSaklarNotif() {
  const res = await api('admin.notif.settings.save', {
    aktifUtama: document.getElementById('swUtama').checked,
    waAktif: document.getElementById('swWa').checked,
    emailAktif: document.getElementById('swEmail').checked
  });
  showNotif(res.message, res.success ? 'success' : 'error');
}
async function jadwalkanBlast() {
  const pesan = document.getElementById('blastPesan').value.trim();
  if (!pesan) return showNotif('Isi pesan wajib diisi.', 'error');
  const res = await api('admin.notif.blast.create', {
    segmen: document.getElementById('blastSegmen').value,
    kanal: document.getElementById('blastKanal').value,
    subjek: document.getElementById('blastSubjek') ? document.getElementById('blastSubjek').value : '',
    pesan, batchSize: Number(document.getElementById('blastBatch').value)
  });
  showNotif(res.message, res.success ? 'success' : 'error');
  if (res.success) { document.getElementById('blastPesan').value = ''; muatAntrean(); muatDashboard(true); }
}
async function prosesAntreanManual() {
  const res = await api('admin.notif.queue.process');
  showNotif(res.success ? 'Antrean diproses.' : res.message, res.success ? 'success' : 'error');
  muatAntrean();
}
async function muatAntrean() {
  const res = await api('admin.notif.queue.list');
  if (!res.success) return;
  const rows = res.data.rows;
  document.getElementById('bcTerkirim').textContent = rows.filter(r => r.status === 'Terkirim').length;
  document.getElementById('bcMenunggu').textContent = rows.filter(r => String(r.status).startsWith('Menunggu')).length;
  document.getElementById('bcGagal').textContent = rows.filter(r => String(r.status).startsWith('Gagal')).length;
  document.getElementById('antreanTable').innerHTML = rows.map(r => {
    const isiPesan = r.kanal === 'WA' ? r.template : (() => { try { return JSON.parse(r.template).isi; } catch (e) { return r.template; } })();
    const statusPill = r.status === 'Terkirim' ? '<span class="pill pill-enrolled">Terkirim</span>'
      : String(r.status).startsWith('Gagal') ? '<span class="pill" style="background:var(--danger-bg); color:var(--danger);">Gagal</span>'
      : '<span class="pill pill-hot">Menunggu</span>';
    return `<tr><td>${esc(r.target)}</td><td>${esc(r.kanal)}</td><td class="text-sm" style="max-width:280px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${esc(isiPesan)}</td><td class="text-sm">${fmtWaktu(r.jadwal_kirim)}</td><td>${statusPill}</td></tr>`;
  }).join('') || '<tr><td colspan="5" class="text-muted">Antrean kosong.</td></tr>';
}
