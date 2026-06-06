const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

// Middleware agar server bisa membaca data JSON dan Form dari frontend
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Database sementara di memori server untuk menyimpan data PTW
let databasePTW = [
    {
        id: 1,
        pemohon: "PT. Maju Jaya",
        jenis: "Hot Work",
        lokasi: "Area Tangki BBM",
        deskripsi: "Pengelasan pipa bocor diameter 2 inch",
        apd: ["Safety Helmet", "Safety Shoes", "Safety Glasses"],
        status: "Menunggu Approval"
    }
];

// Route utama untuk membuka dashboard
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API untuk mengambil semua data PTW
app.get('/api/ptw', (req, res) => {
    res.json(databasePTW);
});

// API untuk menerima kiriman data form PTW baru
app.post('/api/ptw', (req, res) => {
    const { pemohon, jenis, lokasi, deskripsi, apd } = req.body;
    
    const ptwBaru = {
        id: databasePTW.length + 1,
        pemohon,
        jenis,
        lokasi,
        deskripsi,
        apd: apd || [],
        status: "Menunggu Approval"
    };

    databasePTW.push(ptwBaru);
    res.json({ success: true, message: "PTW berhasil diajukan!" });
});

// API untuk menyetujui (Approve) PTW
app.post('/api/ptw/approve/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const ptw = databasePTW.find(item => item.id === id);
    if (ptw) {
        ptw.status = "Approved / Aktif";
        res.json({ success: true, message: "PTW berhasil disetujui!" });
    } else {
        res.status(404).json({ success: false, message: "Data tidak ditemukan" });
    }
});

app.listen(PORT, () => {
    console.log(`Server PTW Online berjalan di http://localhost:${PORT}`);
});