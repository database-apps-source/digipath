// ============================================================================
// admin-crm.js — CRM Kontak: daftar, filter, tag, ubah tahap funnel, impor
// ============================================================================
let _crmInit = false;
let crmHalaman = 1, crmFilterFunnel = '', crmSelected = new Set();

async function initCrmLog() {
  const el = document.getElementById('view-log');
  if (!_crmInit) {
    el.innerHTML = `
      <h1 style="font-size:24px; margin:0 0 .25rem;">CRM Kontak</h1>
      <p class="text-muted text-sm">Nama · Email · WhatsApp — satu basis kontak gabungan dari seluruh member.</p>

      <div class="flex justify-between items-center mt-2" style="flex-wrap:wrap; gap:.75rem;">
        <input class="input" id="crmCari" placeholder="Cari nama, email, atau nomor WA..." style="max-width:320px;">
        <div class="flex gap-1">
          <button class="btn btn-secondary btn-sm" onclick="document.getElementById('crmImportFile').click()">⬆ Impor CSV</button>
          <input type="file" id="crmImportFile" accept=".csv" class="hidden" onchange="importCsv(event)">
        </div>
      </div>
      <div class="chip-row" id="crmFunnelChips">
        <span class="chip active" data-t="">Semua</span>
        <span class="chip" data-t="Lead Baru">Lead Baru</span>
        <span class="chip" data-t="Hot / Follow-up">Hot / Follow-up</span>
        <span class="chip" data-t="Enrolled Paid">Enrolled Paid</span>
      </div>

      <div class="card" style="padding:0;">
        <div class="table-wrap"><table class="data-table">
          <thead><tr><th><input type="checkbox" id="crmSelectAll"></th><th>Kontak</th><th>Tahap Funnel</th><th>Aktivitas Terakhir</th><th>Aksi</th></tr></thead>
          <tbody id="crmTable"></tbody>
        </table></div>
        <div class="flex justify-between items-center" style="padding:1rem;">
          <span class="text-sm text-muted" id="crmPageInfo"></span>
          <div class="flex gap-1"><button class="btn btn-secondary btn-sm" onclick="gantiHalamanCrm(-1)">← Sebelumnya</button><button class="btn btn-secondary btn-sm" onclick="gantiHalamanCrm(1)">Selanjutnya →</button></div>
        </div>
      </div>
      <div class="card mt-2 hidden" id="crmBulkBar">
        <div class="flex items-center gap-2">
          <span class="text-sm" id="crmSelCount">0 dipilih</span>
          <select class="input" id="crmBulkFunnel" style="width:auto;">
            <option value="">Ubah tahap funnel ke...</option>
            <option value="Lead Baru">Lead Baru</option><option value="Hot / Follow-up">Hot / Follow-up</option><option value="Enrolled Paid">Enrolled Paid</option>
          </select>
          <button class="btn btn-primary btn-sm" onclick="terapkanBulk()">Terapkan</button>
        </div>
      </div>`;
    document.getElementById('crmCari').addEventListener('input', debounce_(() => { crmHalaman = 1; muatCrm(); }, 350));
    document.getElementById('crmFunnelChips').addEventListener('click', e => {
      const chip = e.target.closest('.chip'); if (!chip) return;
      document.querySelectorAll('#crmFunnelChips .chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active'); crmFilterFunnel = chip.dataset.t; crmHalaman = 1; muatCrm();
    });
    document.getElementById('crmSelectAll').addEventListener('change', e => {
      document.querySelectorAll('.crm-row-check').forEach(cb => { cb.checked = e.target.checked; toggleSel(cb.value, e.target.checked); });
    });
    _crmInit = true;
  }
  muatCrm();
}
function debounce_(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

async function muatCrm() {
  const res = await api('admin.crm.list', { cari: document.getElementById('crmCari').value, tahapFunnel: crmFilterFunnel, halaman: crmHalaman, per: 50 });
  if (!res.success) return;
  document.getElementById('crmTable').innerHTML = res.data.rows.map(r => `
    <tr>
      <td><input type="checkbox" class="crm-row-check" value="${r.memberId}" onchange="toggleSel('${r.memberId}', this.checked)" ${crmSelected.has(r.memberId) ? 'checked' : ''}></td>
      <td>
        <div style="font-weight:700;">${esc(r.nama)}</div>
        <div class="text-xs text-muted">${esc(r.email)} · ${esc(r.noWa)}</div>
      </td>
      <td>${badgeFunnel(r.tahapFunnel)}</td>
      <td class="text-sm text-muted">${fmtWaktu(r.aktivitasTerakhir)}</td>
      <td><a class="btn btn-ghost btn-sm" href="https://wa.me/${esc((r.noWa||'').replace(/^0/,'62'))}" target="_blank">💬 WA</a></td>
    </tr>`).join('') || '<tr><td colspan="5" class="text-muted">Tidak ada kontak ditemukan.</td></tr>';
  document.getElementById('crmPageInfo').textContent = `Menampilkan ${res.data.rows.length} dari ${res.data.total} kontak`;
}
function gantiHalamanCrm(delta) { crmHalaman = Math.max(1, crmHalaman + delta); muatCrm(); }
function toggleSel(id, checked) {
  checked ? crmSelected.add(id) : crmSelected.delete(id);
  document.getElementById('crmBulkBar').classList.toggle('hidden', crmSelected.size === 0);
  document.getElementById('crmSelCount').textContent = crmSelected.size + ' dipilih';
}
async function terapkanBulk() {
  const nilai = document.getElementById('crmBulkFunnel').value;
  if (!nilai) return showNotif('Pilih tahap funnel tujuan.', 'error');
  const res = await api('admin.crm.bulk', { ids: [...crmSelected], aksi: 'funnel', nilai });
  showNotif(res.message, res.success ? 'success' : 'error');
  if (res.success) { crmSelected.clear(); document.getElementById('crmBulkBar').classList.add('hidden'); muatCrm(); }
}

// Impor CSV member (kolom: nama,email,noWa) — idempoten (prinsip gas-migrasi-database)
function importCsv(e) {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = async () => {
    const lines = reader.result.split(/\r?\n/).filter(Boolean);
    const header = lines[0].toLowerCase().split(',').map(h => h.trim());
    const iNama = header.indexOf('nama'), iEmail = header.indexOf('email'), iWa = header.indexOf('nowa') > -1 ? header.indexOf('nowa') : header.indexOf('wa');
    const rows = lines.slice(1).map(l => { const c = l.split(','); return { nama: c[iNama], email: c[iEmail], noWa: c[iWa] }; });
    const pratinjau = await api('admin.member.import', { rows, dryRun: true });
    if (!pratinjau.success) return showNotif(pratinjau.message, 'error');
    if (!confirm(`Pratinjau: +${pratinjau.data.ditambah} baru, ${pratinjau.data.diperbarui} diperbarui dari ${pratinjau.data.total} baris. Lanjutkan simpan?`)) return;
    const hasil = await api('admin.member.import', { rows, dryRun: false });
    showNotif(hasil.message, hasil.success ? 'success' : 'error');
    if (hasil.success) muatCrm();
  };
  reader.readAsText(file);
  e.target.value = '';
}
