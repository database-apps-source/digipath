// ============================================================================
// admin-kursus.js — Kelola Kelas, Modul (dgn Embed Link YouTube/Dokumen/Drive),
// dan Enrollment manual.
// ============================================================================
let _kursusInit = false;
let modulKelasAktif = '', modulList = [];

async function initKursus() {
  const el = document.getElementById('view-kursus');
  if (!_kursusInit) {
    el.innerHTML = `
      <h1 style="font-size:24px; margin:0 0 .25rem;">Kelola Kelas &amp; Modul</h1>
      <p class="text-muted text-sm">Pembayaran diproses di luar sistem — tandai enrollment setelah transfer diverifikasi manual.</p>

      <div class="grid-2 mt-3">
        <div class="card">
          <h3 style="font-size:15px; margin:0 0 .75rem;">+ Tambah / Ubah Kelas</h3>
          <input type="hidden" id="courseId">
          <div class="field"><label>Judul Kelas</label><input class="input" id="courseJudul"></div>
          <div class="field"><label>Deskripsi</label><textarea class="input" id="courseDeskripsi"></textarea></div>
          <div class="field"><label><input type="checkbox" id="coursePublish" checked> Publikasikan kelas</label></div>
          <button class="btn btn-primary" onclick="simpanCourse()">Simpan Kelas</button>
        </div>
        <div class="card">
          <h3 style="font-size:15px; margin:0 0 .75rem;">✅ Daftarkan Member ke Kelas</h3>
          <div class="field"><label>Email Member</label><input class="input" id="enrollEmail" placeholder="nama@email.com"></div>
          <div class="field"><label>Pilih Kelas</label><select class="input" id="enrollCourse"></select></div>
          <button class="btn btn-primary" onclick="daftarkanMember()">Daftarkan Member</button>
          <p class="text-xs text-muted mt-1">Member akan otomatis menerima notifikasi WA/Email bahwa kelas telah dibuka.</p>
        </div>
      </div>

      <div class="card mt-3" style="padding:0;">
        <div style="padding:1rem;"><h3 style="font-size:15px; margin:0;">Daftar Kelas</h3></div>
        <div class="table-wrap"><table class="data-table">
          <thead><tr><th>Judul</th><th>Modul</th><th>Status</th><th>Aksi</th></tr></thead>
          <tbody id="courseTable"></tbody>
        </table></div>
      </div>

      <!-- ===================== KELOLA MODUL (Embed Link) ===================== -->
      <div class="card mt-3" id="modulSection">
        <div class="flex justify-between items-center" style="flex-wrap:wrap; gap:.75rem;">
          <h3 style="font-size:15px; margin:0;">🎬 Kelola Modul &amp; Konten</h3>
          <select class="input" id="modulKelasSelect" style="max-width:320px;"></select>
        </div>
        <p class="text-xs text-muted mt-1">Konten modul bisa berupa video YouTube, link embed (Google Docs/PDF/Canva, dll), atau file yang diunggah ke Drive.</p>

        <div class="grid-2 mt-2" style="align-items:start;">
          <div>
            <input type="hidden" id="lsnId">
            <div class="field"><label>Urutan</label><input class="input" type="number" min="1" id="lsnUrutan" value="1"></div>
            <div class="field"><label>Judul Modul</label><input class="input" id="lsnJudul" placeholder="Mis. Modul 05: Integrasi Webhook"></div>

            <div class="field">
              <label>Sumber Konten</label>
              <div class="chip-row" id="sumberKontenChips" style="margin:.25rem 0 0;">
                <span class="chip active" data-s="youtube">▶ YouTube</span>
                <span class="chip" data-s="link">🔗 Link Embed (Dok/PDF/dll)</span>
                <span class="chip" data-s="drive">📁 Upload Drive</span>
              </div>
            </div>

            <div class="field" id="wrapYoutube">
              <label>URL Video YouTube</label>
              <input class="input" id="lsnUrlYoutube" placeholder="https://www.youtube.com/watch?v=...">
            </div>
            <div class="field hidden" id="wrapLink">
              <label>URL Link Embed (wajib https://)</label>
              <input class="input" id="lsnUrlLink" placeholder="https://docs.google.com/document/d/.../preview">
              <p class="text-xs text-muted mt-1">Gunakan link versi "preview" / "embed" agar tampil langsung tanpa diunduh (Google Docs: ganti akhiran <code>/edit</code> dengan <code>/preview</code>).</p>
            </div>
            <div class="field hidden" id="wrapDrive">
              <label>Upload File ke Drive</label>
              <div class="flex gap-1 items-center">
                <button type="button" class="btn btn-secondary btn-sm" onclick="document.getElementById('fileUploadInput').click()">⬆ Pilih &amp; Unggah File</button>
                <input type="file" id="fileUploadInput" class="hidden" onchange="mulaiUploadFile(event)">
                <span class="text-sm text-muted" id="uploadStatusText"></span>
              </div>
              <div class="progress-track mt-1 hidden" id="uploadProgressWrap"><div class="progress-fill" id="uploadProgressBar" style="width:0%"></div></div>
              <input class="input mt-2" id="lsnAssetId" placeholder="Drive File ID akan terisi otomatis setelah unggah selesai...">
              <p class="text-xs text-muted mt-1">Atau tempel manual File ID dari link Drive yang sudah ada: <code>drive.google.com/file/d/<b>FILE_ID_DI_SINI</b>/view</code>. Maks 2GB — unggahan langsung ke Drive, tidak melalui batas ukuran server.</p>
            </div>

            <div class="field"><label>Tipe Tampilan</label>
              <select class="input" id="lsnTipe"><option value="video">Video</option><option value="dokumen">Dokumen</option></select>
            </div>
            <div class="flex gap-1">
              <button class="btn btn-primary" onclick="simpanModul()">Simpan Modul</button>
              <button class="btn btn-ghost" onclick="resetFormModul()">Batal / Modul Baru</button>
            </div>
          </div>

          <div>
            <div style="font-weight:700; font-size:13px; margin-bottom:.5rem;">Daftar Materi Kelas</div>
            <div id="modulListWrap"></div>
          </div>
        </div>
      </div>`;

    document.getElementById('modulKelasSelect').addEventListener('change', e => { modulKelasAktif = e.target.value; muatModulList(); });
    document.getElementById('sumberKontenChips').addEventListener('click', e => {
      const chip = e.target.closest('.chip'); if (!chip) return;
      gantiSumberKonten(chip.dataset.s);
    });
    _kursusInit = true;
  }
  muatCourses();
}

function gantiSumberKonten(sumber) {
  document.querySelectorAll('#sumberKontenChips .chip').forEach(c => c.classList.toggle('active', c.dataset.s === sumber));
  document.getElementById('wrapYoutube').classList.toggle('hidden', sumber !== 'youtube');
  document.getElementById('wrapLink').classList.toggle('hidden', sumber !== 'link');
  document.getElementById('wrapDrive').classList.toggle('hidden', sumber !== 'drive');
}
function sumberAktif_() { return document.querySelector('#sumberKontenChips .chip.active').dataset.s; }

async function muatCourses() {
  const res = await api('courses.list', { _fresh: 1 });
  if (!res.success) return;
  const opts = res.data.map(c => `<option value="${c.id}">${esc(c.judul)}</option>`).join('');
  document.getElementById('enrollCourse').innerHTML = opts;
  document.getElementById('modulKelasSelect').innerHTML = opts;
  document.getElementById('courseTable').innerHTML = res.data.map(c => `
    <tr>
      <td style="font-weight:600;">${esc(c.judul)}</td>
      <td>${c.totalModul} modul</td>
      <td><span class="pill pill-enrolled">Published</span></td>
      <td class="flex gap-1">
        <button class="btn btn-ghost btn-sm" onclick="editCourse('${c.id}','${esc(c.judul).replace(/'/g, "&#39;")}')">Ubah</button>
        <button class="btn btn-ghost btn-sm" onclick="kelolaModul('${c.id}')">Kelola Modul</button>
      </td>
    </tr>`).join('') || '<tr><td colspan="4" class="text-muted">Belum ada kelas.</td></tr>';

  if (!modulKelasAktif && res.data.length) modulKelasAktif = res.data[0].id;
  if (modulKelasAktif) { document.getElementById('modulKelasSelect').value = modulKelasAktif; muatModulList(); }
}
function editCourse(id, judul) { document.getElementById('courseId').value = id; document.getElementById('courseJudul').value = judul; window.scrollTo({ top: 0, behavior: 'smooth' }); }
function kelolaModul(courseId) {
  modulKelasAktif = courseId;
  document.getElementById('modulKelasSelect').value = courseId;
  muatModulList();
  document.getElementById('modulSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function simpanCourse() {
  const judul = document.getElementById('courseJudul').value.trim();
  if (!judul) return showNotif('Judul kelas wajib diisi.', 'error');
  const res = await api('admin.course.save', {
    id: document.getElementById('courseId').value || undefined,
    judul, deskripsi: document.getElementById('courseDeskripsi').value,
    statusPublish: document.getElementById('coursePublish').checked
  });
  showNotif(res.message, res.success ? 'success' : 'error');
  if (res.success) { document.getElementById('courseId').value = ''; document.getElementById('courseJudul').value = ''; document.getElementById('courseDeskripsi').value = ''; muatCourses(); }
}

// ---------------------------- MODUL / KONTEN ----------------------------
async function muatModulList() {
  if (!modulKelasAktif) return;
  const res = await api('admin.lesson.list', { courseId: modulKelasAktif, _fresh: 1 });
  if (!res.success) return showNotif(res.message, 'error');
  modulList = res.data;
  document.getElementById('lsnUrutan').value = modulList.length + 1;
  const ikon = { youtube: '▶️', link: '🔗', drive: '📁' };
  document.getElementById('modulListWrap').innerHTML = modulList.map(l => `
    <div class="lesson-item" style="cursor:default;">
      <span class="lesson-icon current">${ikon[l.sumberKonten] || '📁'}</span>
      <span style="flex:1;">Modul ${l.urutan}: ${esc(l.judul)}
        <div class="text-xs text-muted">${l.sumberKonten === 'youtube' ? 'YouTube' : l.sumberKonten === 'link' ? 'Link Embed' : 'Upload Drive'}</div>
      </span>
      <button class="btn btn-ghost btn-sm" onclick="editModul('${l.id}')">Ubah</button>
      <button class="btn btn-ghost btn-sm" style="color:var(--danger);" onclick="hapusModul('${l.id}')">Hapus</button>
    </div>`).join('') || '<p class="text-muted text-sm">Belum ada modul pada kelas ini.</p>';
}

function editModul(id) {
  const l = modulList.find(x => x.id === id); if (!l) return;
  document.getElementById('lsnId').value = l.id;
  document.getElementById('lsnUrutan').value = l.urutan;
  document.getElementById('lsnJudul').value = l.judul;
  document.getElementById('lsnTipe').value = l.tipe === 'dokumen' ? 'dokumen' : 'video';
  gantiSumberKonten(l.sumberKonten);
  document.getElementById('lsnUrlYoutube').value = l.sumberKonten === 'youtube' ? 'https://youtu.be/' + l.urlEmbed : '';
  document.getElementById('lsnUrlLink').value = l.sumberKonten === 'link' ? l.urlEmbed : '';
  document.getElementById('lsnAssetId').value = l.sumberKonten === 'drive' ? l.assetId : '';
  document.getElementById('modulSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function resetFormModul() {
  document.getElementById('lsnId').value = '';
  document.getElementById('lsnJudul').value = '';
  document.getElementById('lsnUrutan').value = modulList.length + 1;
  document.getElementById('lsnUrlYoutube').value = '';
  document.getElementById('lsnUrlLink').value = '';
  document.getElementById('lsnAssetId').value = '';
  document.getElementById('uploadStatusText').textContent = '';
  document.getElementById('uploadProgressWrap').classList.add('hidden');
  gantiSumberKonten('youtube');
}

async function simpanModul() {
  if (!modulKelasAktif) return showNotif('Pilih kelas terlebih dahulu.', 'error');
  const judul = document.getElementById('lsnJudul').value.trim();
  if (!judul) return showNotif('Judul modul wajib diisi.', 'error');
  const sumberKonten = sumberAktif_();
  const payload = {
    id: document.getElementById('lsnId').value || undefined,
    courseId: modulKelasAktif,
    urutan: Number(document.getElementById('lsnUrutan').value || 1),
    judul, tipe: document.getElementById('lsnTipe').value, sumberKonten
  };
  if (sumberKonten === 'youtube') payload.urlEmbed = document.getElementById('lsnUrlYoutube').value.trim();
  if (sumberKonten === 'link') payload.urlEmbed = document.getElementById('lsnUrlLink').value.trim();
  if (sumberKonten === 'drive') payload.assetId = document.getElementById('lsnAssetId').value.trim();

  const res = await api('admin.lesson.save', payload);
  showNotif(res.message, res.success ? 'success' : 'error');
  if (res.success) { resetFormModul(); muatModulList(); muatCourses(); }
}

async function hapusModul(id) {
  if (!confirm('Hapus modul ini? Progres belajar member pada modul ini juga akan terasa hilang.')) return;
  const res = await api('admin.lesson.delete', { id });
  showNotif(res.message, res.success ? 'success' : 'error');
  if (res.success) { muatModulList(); muatCourses(); }
}

// ------------------- UPLOAD LANGSUNG BROWSER → DRIVE (resumable, per-chunk) -------------------
// Token Google TIDAK PERNAH ada di browser — hanya potongan byte file yang dikirim
// ke endpoint GAS kita sendiri; GAS yang meneruskan ke Drive dengan token server-side.
function bufferToBase64_(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const ukuranPotong = 0x8000;
  for (let i = 0; i < bytes.length; i += ukuranPotong) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + ukuranPotong));
  }
  return btoa(binary);
}

async function mulaiUploadFile(e) {
  const file = e.target.files[0]; if (!file) return;
  if (!modulKelasAktif) { showNotif('Pilih kelas terlebih dahulu di atas.', 'error'); e.target.value = ''; return; }
  const statusEl = document.getElementById('uploadStatusText');
  const wrapBar = document.getElementById('uploadProgressWrap'), bar = document.getElementById('uploadProgressBar');
  wrapBar.classList.remove('hidden'); bar.style.width = '0%';
  statusEl.textContent = 'Memulai sesi upload...';

  try {
    const initRes = await api('admin.asset.upload.init', {
      namaFile: file.name, mimeType: file.type || 'application/octet-stream', ukuranBytes: file.size, courseId: modulKelasAktif
    });
    if (!initRes.success) throw new Error(initRes.message);
    const { uploadId, ukuranChunk } = initRes.data;

    let offset = 0;
    while (offset < file.size) {
      const akhir = Math.min(offset + ukuranChunk, file.size);
      const buffer = await file.slice(offset, akhir).arrayBuffer();
      const chunkBase64 = bufferToBase64_(buffer);
      const res = await api('admin.asset.upload.chunk', { uploadId, chunkBase64 });
      if (!res.success) throw new Error(res.message);
      if (res.data.selesai) {
        bar.style.width = '100%';
        statusEl.textContent = '✓ Selesai: ' + file.name;
        document.getElementById('lsnAssetId').value = res.data.driveFileId;
        showNotif(res.message, 'success');
        e.target.value = '';
        return;
      }
      offset = res.data.offset;
      bar.style.width = res.data.persen + '%';
      statusEl.textContent = 'Mengunggah... ' + res.data.persen + '%';
    }
  } catch (err) {
    statusEl.textContent = '';
    wrapBar.classList.add('hidden');
    showNotif('Gagal unggah: ' + err.message, 'error');
    e.target.value = '';
  }
}

async function daftarkanMember() {
  const email = document.getElementById('enrollEmail').value.trim();
  const courseId = document.getElementById('enrollCourse').value;
  if (!email) return showNotif('Masukkan email member.', 'error');
  // Cari memberId via CRM list (reuse endpoint pencarian)
  const cari = await api('admin.crm.list', { cari: email, halaman: 1, per: 1 });
  const memberId = cari.success && cari.data.rows[0] ? cari.data.rows[0].memberId : null;
  if (!memberId) return showNotif('Member dengan email tersebut tidak ditemukan.', 'error');
  const res = await api('admin.enrollment.set', { memberId, courseId });
  showNotif(res.message, res.success ? 'success' : 'error');
  if (res.success) document.getElementById('enrollEmail').value = '';
}
