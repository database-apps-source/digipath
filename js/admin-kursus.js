// ============================================================================
// admin-kursus.js — Kelola Kelas, Modul, dan Enrollment manual
// ============================================================================
let _kursusInit = false;

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
      </div>`;
    _kursusInit = true;
  }
  muatCourses();
}

async function muatCourses() {
  const res = await api('courses.list', { _fresh: 1 });
  if (!res.success) return;
  document.getElementById('enrollCourse').innerHTML = res.data.map(c => `<option value="${c.id}">${esc(c.judul)}</option>`).join('');
  document.getElementById('courseTable').innerHTML = res.data.map(c => `
    <tr>
      <td style="font-weight:600;">${esc(c.judul)}</td>
      <td>${c.totalModul} modul</td>
      <td>${c.jenisAkses === undefined ? '' : ''}<span class="pill pill-enrolled">Published</span></td>
      <td><button class="btn btn-ghost btn-sm" onclick="editCourse('${c.id}','${esc(c.judul).replace(/'/g,"&#39;")}')">Ubah</button></td>
    </tr>`).join('') || '<tr><td colspan="4" class="text-muted">Belum ada kelas.</td></tr>';
}
function editCourse(id, judul) { document.getElementById('courseId').value = id; document.getElementById('courseJudul').value = judul; window.scrollTo({ top: 0, behavior: 'smooth' }); }

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
