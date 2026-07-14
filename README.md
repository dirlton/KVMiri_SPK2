# 🚀 Website Interaktif SPK KV Miri 2026

![Version](https://img.shields.io/badge/Version-2.0-blue)
![HTML5](https://img.shields.io/badge/HTML5-E34F26-orange)
![CSS3](https://img.shields.io/badge/CSS3-1572B6-blue)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6-yellow)
![Google Apps
Script](https://img.shields.io/badge/Google%20Apps%20Script-Backend-success)
![Google
Sheets](https://img.shields.io/badge/Google%20Sheets-Database-green)

> Sistem Pembelajaran Interaktif (Learning Management System) bagi
> Sistem Pengurusan Kualiti (SPK) Kolej Vokasional Miri.

------------------------------------------------------------------------

# 📖 Pengenalan

Website Interaktif SPK KV Miri dibangunkan untuk menyediakan platform
pembelajaran digital yang moden, interaktif dan mesra pengguna bagi
latihan Sistem Pengurusan Kualiti (SPK).

## ✨ Ciri-ciri

-   📚 Modul Pembelajaran Interaktif
-   📝 Kuiz Setiap Modul
-   🎯 Final Assessment (50 Soalan)
-   📈 Dashboard Kemajuan
-   🏅 XP & Badge
-   🔓 Unlock Modul Automatik
-   📄 Penjanaan Sijil
-   ☁️ Integrasi Google Apps Script
-   📊 Google Sheets sebagai pangkalan data
-   👤 Pendaftaran Peserta
-   📋 Rekod Kehadiran
-   📊 Rekod Markah
-   🔍 Semakan Sijil

# 🏗️ Seni Bina Sistem

``` text
Peserta
   │
   ▼
Pendaftaran
   │
   ▼
Google Apps Script
   │
   ▼
Google Sheets (Kehadiran)
   │
   ▼
Dashboard
   │
   ▼
Modul 1 → Modul 5
   │
   ▼
Final Assessment
   │
   ▼
Google Apps Script
   │
   ▼
Google Sheets (Markah)
   │
   ▼
Sijil
```

# 📁 Struktur Projek

``` text
WebsiteSPK2026/
│
├── assets/
├── css/
├── js/
├── data/
├── modules/
├── dashboard/
├── certificate/
├── components/
├── google-apps-script/
├── config.js
└── index.html
```

# ⚙️ Keperluan

-   Visual Studio Code
-   Live Server
-   Google Chrome / Microsoft Edge
-   Akaun Google
-   Google Sheets
-   Google Apps Script

# 🚀 Pemasangan

1.  Muat turun projek.
2.  Ekstrak fail ZIP.
3.  Buka folder menggunakan VS Code.
4.  Pasang extension **Live Server**.
5.  Klik kanan `index.html`.
6.  Pilih **Open with Live Server**.

# ☁️ Google Sheets

Sediakan spreadsheet dengan dua sheet:

## Kehadiran

-   Nama
-   No KP
-   Email
-   Jawatan
-   Unit

## Markah

-   Nama
-   No KP
-   Email
-   Jawatan
-   Unit
-   Tarikh
-   Masa
-   Markah
-   Peratus
-   Status
-   Masa Menjawab
-   Cubaan
-   Certificate ID

# ☁️ Google Apps Script

1.  Extensions → Apps Script
2.  Tampal kod `Code.gs`
3.  Deploy → Web App
4.  Execute As: **Me**
5.  Who has access: **Anyone**
6.  Salin URL Web App

# ⚙️ config.js

Semua tetapan sistem hendaklah berada di dalam `config.js`.

Contoh:

-   API_URL
-   PASS_MARK
-   TOTAL_FINAL_QUESTIONS
-   APP_VERSION
-   CERTIFICATE_PREFIX

# 👤 Aliran Pengguna

1.  Daftar Peserta
2.  Dashboard
3.  Selesaikan Modul
4.  Jawab Kuiz
5.  Final Assessment
6.  Hantar Markah
7.  Jana Sijil

# 🛠️ Troubleshooting

## Data tidak dihantar

-   Semak API_URL.
-   Semak deployment Google Apps Script.
-   Semak akses "Anyone".
-   Semak Console Browser (F12).

## Tiada markah direkod

-   Pastikan sheet `Markah` wujud.
-   Pastikan Apps Script berjaya menerima `saveScore`.

# 🔮 Perancangan Masa Hadapan

-   Dashboard Pentadbir
-   Analitik Prestasi
-   Leaderboard
-   Email Automatik
-   Looker Studio
-   AI Learning Assistant

# 👨‍💻 Pembangun

**Salton Dirlys**

Kolej Vokasional Miri

# 📄 Lesen

Hak Cipta © Kolej Vokasional Miri.

Dokumen ini boleh diubah suai untuk kegunaan dalaman SPK.
