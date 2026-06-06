const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'database.db'), (err) => {
    if (err) return console.error(err.message);
    console.log('Membuka file database.db...');
});

db.all('SELECT * FROM ptw_records', [], (err, rows) => {
    if (err) {
        console.error('Tabel eror atau tidak ditemukan:', err.message);
        return;
    }
    console.log('=== ISI DATA DI DALAM DATABASE INDUK ===');
    console.log(rows);
    console.log('========================================');
    console.log(`Total data terdeteksi: ${rows.length} baris.`);
});

db.close();
