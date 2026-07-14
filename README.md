WEBSITE INTERAKTIF SPK KV MIRI 2026

README (Panduan Pemasangan & Penggunaan)

  Versi: 2.0 Status: Production Ready

============================================================ 1.
PENGENALAN ============================================================

Website Interaktif SPK KV Miri merupakan sebuah Learning Management
System (LMS) berasaskan HTML, CSS dan JavaScript yang dibangunkan untuk
menyokong latihan Sistem Pengurusan Kualiti (SPK).

Fungsi utama: - Modul pembelajaran interaktif - Kuiz setiap modul -
Final Assessment - Dashboard - Progress pembelajaran - XP & Badge -
Sijil automatik - Integrasi Google Apps Script - Google Sheets sebagai
pangkalan data - Rekod kehadiran - Rekod markah

============================================================ 2.
TEKNOLOGI ============================================================

Frontend: - HTML5 - CSS3 - JavaScript ES6

Backend: - Google Apps Script

Database: - Google Sheets

Storage: - LocalStorage

============================================================ 3.
KEPERLUAN ============================================================

-   Google Chrome / Edge
-   VS Code
-   Live Server
-   Akaun Google
-   Google Spreadsheet
-   Google Apps Script

============================================================ 4. STRUKTUR
FOLDER ============================================================

WebsiteSPK2026/ assets/ css/ js/ data/ modules/ dashboard/ certificate/
components/ google-apps-script/ config.js index.html

============================================================ 5.
PENYEDIAAN GOOGLE SHEETS
============================================================

Cipta Spreadsheet: SPK KV Miri 2026

Sheet: 1. Kehadiran 2. Markah

Sheet Markah: Nama No KP Email Jawatan Unit Tarikh Masa Markah Peratus
Status Masa Menjawab Cubaan Certificate ID

============================================================ 6. GOOGLE
APPS SCRIPT ============================================================

Extensions -> Apps Script

Deploy: - Web App - Execute As: Me - Who Has Access: Anyone

Simpan URL Web App ke config.js.

============================================================ 7.
CONFIG.JS ============================================================

Simpan semua konfigurasi di satu tempat.

Contoh: API_URL PASS_MARK TOTAL_FINAL_QUESTIONS APP_VERSION
CERTIFICATE_PREFIX

============================================================ 8. ALIRAN
SISTEM ============================================================

Landing Page ↓ Pendaftaran Peserta ↓ Dashboard ↓ Module 1 ↓ Module 2 ↓
Module 3 ↓ Module 4 ↓ Module 5 ↓ Final Assessment ↓ Google Apps Script ↓
Google Sheets ↓ Certificate

============================================================ 9.
PENDAFTARAN PESERTA
============================================================

Maklumat: - Nama - No KP - Email - Jawatan - Unit

Disimpan ke: - LocalStorage - Google Sheets

============================================================ 10. FINAL
ASSESSMENT ============================================================

50 soalan Bahasa Malaysia Rawak 4 pilihan jawapan Markah automatik

Selepas selesai: - Hantar markah - Jana Certificate ID - Papar keputusan

============================================================ 11.
TROUBLESHOOTING
============================================================

Data tidak dihantar: - Semak API_URL - Semak deployment Apps Script -
Semak kebenaran “Anyone” - Semak Console Browser

============================================================ 12.
PENYELENGGARAAN
============================================================

-   Jangan hardcode URL.
-   Gunakan config.js.
-   Backup Google Sheets.
-   Backup Apps Script.

============================================================ 13. ROADMAP
============================================================

-   Dashboard Pentadbir
-   Semakan Sijil
-   Email automatik
-   Leaderboard
-   Looker Studio
-   Analitik

============================================================ 14. LESEN
============================================================

Hak Cipta © Kolej Vokasional Miri. Untuk kegunaan dalaman dan latihan
SPK.
