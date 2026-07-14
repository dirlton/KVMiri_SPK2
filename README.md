# Website Interaktif SPK KV Miri 2026

Portal pembelajaran SPK yang dinaik taraf dengan pendaftaran peserta, final assessment 50 soalan, integrasi Google Apps Script, Certificate ID, semakan sijil dan Dashboard Pentadbir.

## Konfigurasi

Semua tetapan sistem utama berada di:

`assets/js/config.js`

Tetapan termasuk `API_URL`, `PASS_MARK`, `TOTAL_FINAL_QUESTIONS`, `CERTIFICATE_PREFIX`, `STORAGE_KEY`, `MAX_ATTEMPT` dan status integrasi Google Apps Script.

## Google Apps Script

Kod backend penuh disediakan di:

`google-apps-script/Code.gs`

Salin kandungan fail tersebut ke projek Google Apps Script Web App yang menggunakan URL dalam `config.js`. Script akan menyediakan dua sheet:

- `Kehadiran`
- `Markah`

Endpoint menyokong action berikut:

- `saveAttendance`
- `saveScore`
- `generateCertificate`
- `verifyCertificate`
- `getStatistics`
- `getParticipant`

## Aliran Peserta

Peserta mendaftar sekali sahaja, rekod dihantar ke Sheet `Kehadiran`, kemudian peserta meneruskan pembelajaran melalui Dashboard. Markah final assessment dihantar ke Sheet `Markah`, dan Certificate ID dijana oleh Google Apps Script apabila peserta lulus.
"# KVMiri_SPK2" 
