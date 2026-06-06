const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ATUR ENGINES VIEW MENGGUNAKAN EJS (SERVER-SIDE RENDERING)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Sajikan folder public secara statis untuk buat-ptw.html
app.use(express.static(path.join(__dirname, 'public')));

// Inisialisasi Database Portabel SQLite3
const db = new sqlite3.Database(path.join(__dirname, 'database.db'), (err) => {
    if (err) console.error('Gagal membuat file database:', err.message);
});

// ROUTE UTAMA: SERVER LANGSUNG MEMASUKKAN DATA SQLITE3 KE TABEL SEBELUM DIKIRIM
app.get('/', (req, res) => {
    db.all('SELECT * FROM ptw_records ORDER BY id DESC', [], (err, rows) => {
        if (err) return res.status(500).send("Gagal memuat database: " + err.message);
        
        // Konversi data APD string menjadi array bersih
        const formatData = rows.map(item => ({
            ...item,
            apd: item.apd ? item.apd.split(', ') : []
        }));

        // Kirim halaman index.ejs secara utuh beserta isi datanya ke browser
        res.render('index', { dataPTW: formatData });
    });
});

// API Ambil Data (Tetap disediakan untuk cadangan)
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

// API Menerima Form Baru dari buat-ptw.html
app.post('/api/ptw', (req, res) => {
    const { pemohon, jenis, lokasi, apd } = req.body;
    const stringAPD = Array.isArray(apd) ? apd.join(', ') : '';

    const queryInsert = 'INSERT INTO ptw_records (pemohon, jenis, lokasi, apd) VALUES (?, ?, ?, ?)';
    db.run(queryInsert, [pemohon, jenis, lokasi, stringAPD], function(err) {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json({ success: true });
    });
});

// API Memproses Tanda Tangan Digital
app.post('/api/approve-ptw-digital/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const { tandaTangan } = req.body;

    const queryUpdate = 'UPDATE ptw_records SET status = "Approved / Aktif", tandaTangan = ? WHERE id = ?';
    db.run(queryUpdate, [tandaTangan, id], function(err) {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json({ success: true });
    });
});

app.listen(PORT, () => {
    console.log(`Server PTW Online EJS berjalan di http://localhost:${PORT}`);
});
