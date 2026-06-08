const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Inisialisasi Database SQLite3
const db = new sqlite3.Database(path.join(__dirname, 'database.db'), (err) => {
    if (err) console.error('Gagal terhubung ke file database:', err.message);
});

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS ptw_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pemohon TEXT NOT NULL,
            jenis TEXT NOT NULL,
            lokasi TEXT NOT NULL,
            apd TEXT NOT NULL,
            status TEXT DEFAULT 'Menunggu Approval',
            tandaTangan TEXT NULL
        )
    `);
});

// ROUTE INDUK MONITORING DASHBOARD
app.get('/', (req, res) => {
    db.all('SELECT * FROM ptw_records ORDER BY id DESC', [], (err, rows) => {
        if (err) return res.status(500).send("Gagal memuat database: " + err.message);
        const formatData = rows.map(item => ({
            ...item,
            apd: item.apd ? item.apd.split(', ') : []
        }));
        res.render('index', { dataPTW: formatData });
    });
});

// API KONTROL AMBIL DATA
app.get('/api/ptw', (req, res) => {
    db.all('SELECT * FROM ptw_records ORDER BY id DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const formatData = rows.map(item => ({
            ...item,
            apd: item.apd ? item.apd.split(', ') : []
        }));
        res.json(formatData);
    });
});

// API INPUT FORM PTW BARU DENGAN DUKUNGAN LAMPIRAN FILE DOKUMEN HSSE
app.post('/api/ptw', (req, res) => {
    // Menarik data pemohon, jenis, lokasi, apd, dan lampiran file baru dari frontend
    const { pemohon, jenis, lokasi, apd, lampiran } = req.body;
    const stringAPD = Array.isArray(apd) ? apd.join(', ') : '';

    // Modifikasi tabel SQLite3 otomatis secara aman jika kolom lampiran belum terdaftar
    db.run("ALTER TABLE ptw_records ADD COLUMN lampiran TEXT", [], () => {
        // Abaikan eror jika kolom sudah terlanjur ada di database lama Bapak
        const queryInsert = 'INSERT INTO ptw_records (pemohon, jenis, lokasi, apd, lampiran) VALUES (?, ?, ?, ?, ?)';
        db.run(queryInsert, [pemohon, jenis, lokasi, stringAPD, lampiran || null], function(err) {
            if (err) return res.status(500).json({ success: false, error: err.message });
            res.json({ success: true });
        });
    });
});


// =========================================================================
// RUTE CETAK FINAL: PENATAAN UKURAN MATEMATIKA KERTAS (DIJAMIN CENTER & RESMI)
// =========================================================================
app.get('/cetak/:id', (req, res) => {
    const id = parseInt(req.params.id);
    db.get('SELECT * FROM ptw_records WHERE id = ?', [id], (err, item) => {
        if (err || !item) {
            return res.status(404).send("Dokumen permit tidak ditemukan di database!");
        }
        
        const listAPD = item.apd || '-';

        res.send(`
          <html>
          <head>
            <title>Cetak Permit #00${item.id}</title>
            <style>
              body { font-family: Arial, sans-serif; background: white; color: black; padding: 40px; display: flex; flex-direction: column; min-height: 90vh; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 13px; }
              td { padding: 12px; border: 1px solid #cbd5e1; }
              
              /* SUSUNAN HEADER BARU BERSANDING HORIZONTAL */
              .header-container { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #ff0000; padding-bottom: 15px; margin-bottom: 25px; }
              
              /* Sisi Kiri dibuat Kosong/Lowong seukuran boks kanan agar Judul Tengah benar-benar Center */
              .left-empty-box { width: 280px; }
              
              /* KUNCI CENTER LINE UNTUK JUDUL UTAMA */
              .title-box { flex: 1; text-align: center; }
              .title-main { color: #005691; margin: 0; font-size: 20px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; }
              .title-sub { margin: 5px 0 0 0; font-size: 12px; font-weight: bold; color: #64748b; text-transform: uppercase; }
              
              /* Pojok Kanan Atas: Logo Berjejer ke Samping dengan Teks Instansi */
              .right-brand-container { display: flex; align-items: center; gap: 12px; width: 280px; justify-content: flex-end; }
              .logo-img { height: 32px; width: auto; display: block; }
              .company-text-box { text-align: left; border-left: 2px solid #cbd5e1; padding-left: 10px; }
              .company-main { margin: 0; font-size: 13px; color: #1e293b; font-weight: bold; line-height: 1.2; white-space: nowrap; }
              .company-sub { margin: 0; font-size: 9px; color: #64748b; font-weight: 700; white-space: nowrap; }
              
              /* AREA BAWAH UNTUK TOMBOL CETAK KIRI BAWAH */
              .footer-action-area { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 40px; }
              .btn-print { background-color: #ef4444; color: white; border: none; font-weight: bold; padding: 12px 22px; font-size: 14px; border-radius: 6px; cursor: pointer; display: inline-block; }
              
              @media print { .btn-print { display: none !important; } }
            </style>
          </head>
          <body>

            <!-- TAMPILAN HEADER LOGO BERSANDING DI SAMPING KIRI TULISAN -->
            <div class="header-container">
              <div class="left-empty-box"></div>
              
              <!-- Tengah: Judul Utama Konsisten Center Line -->
              <div class="title-box">
                <h2 class="title-main">PERMIT TO WORK (PTW)</h2>
                <p class="title-sub">SISTEM VALIDASI K3 DIGITAL</p>
              </div>
              
              <!-- Kanan Atas: Logo Pertamina di Kiri, Teks Instansi di Kanan -->
              <div class="right-brand-container">
                <img class="logo-img" src="https://ridwananwar.publit.io/file/logo-pertamina.png" alt="Pertamina">
                <div class="company-text-box">
                  <h3 class="company-main">PHE JAMBI MERANG</h3>
                  <p class="company-sub">SUBHOLDING UPSTREAM</p>
                </div>
              </div>
            </div>

            <div style="margin-bottom: 20px;"><p style="font-size: 14px; font-weight: bold; color: #005691;">NOMOR DOKUMEN PERMIT: <span style="color: #ef4444;">#00${item.id}</span></p></div>
            <table>
              <tr><td style="font-weight: bold; width: 30%; background-color: #f8fafc;">Nama Kontraktor</td><td>${item.pemohon}</td></tr>
              <tr><td style="font-weight: bold; background-color: #f8fafc;">Kategori Pekerjaan</td><td style="font-weight: bold; color: #0284c7;">${item.jenis}</td></tr>
              <tr><td style="font-weight: bold; background-color: #f8fafc;">Lokasi Area Kerja</td><td>${item.lokasi}</td></tr>
              <tr><td style="font-weight: bold; background-color: #f8fafc;">Persyaratan APD</td><td style="color: #475569;">${listAPD}</td></tr>
              <tr><td style="font-weight: bold; background-color: #f8fafc;">Status Validitas</td><td style="font-weight: 700; color: #166534;">APPROVED / VALID DOKUMEN</td></tr>
            </table>
            
            <!-- BLOK FOOTER ACTIONS -->
            <div class="footer-action-area">
              <!-- Posisi Kiri Bawah: Tombol Cetak Merah -->
              <div>
                <button class="btn-print" onclick="window.print()">Tekan untuk Cetak Dokumen / Simpan PDF</button>
              </div>
              
              <!-- Posisi Kanan Bawah: Otorisasi Tanda Tangan Jari Bapak -->
              <div style="text-align: center; width: 200px;">
                <p style="font-size: 12px; font-weight: bold; margin-bottom: 10px;">Disetujui Oleh,<br>HSSE Department Officer</p>
                <img src="${item.tandaTangan}" style="max-height: 60px; width: auto; border: 1px solid #cbd5e1; padding: 2px; border-radius: 4px; margin-bottom: 5px;">
                <p style="font-size: 11px; font-weight: bold; color: #166534; margin: 0;">PHE JAMBI MERANG VALIDATED</p>
              </div>
            </div>

          </body>
          </html>
        `);
    });
});

app.listen(PORT, () => {
    console.log(`Server PTW Online EJS berjalan di http://localhost:${PORT}`);
});