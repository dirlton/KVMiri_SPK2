var CONFIG = {
  CERTIFICATE_PREFIX: 'SPK-2026',
  PASS_MARK: 80,
  SPREADSHEET_NAME: 'SPK KV MIRI 2026 - Rekod LMS',
  SHEETS: {
    ATTENDANCE: 'Kehadiran',
    SCORES: 'Markah'
  },
  HEADERS: {
    ATTENDANCE: ['Timestamp', 'Nama', 'No KP', 'Email', 'Jawatan', 'Unit', 'Tarikh', 'Masa', 'App Version'],
    SCORES: ['Timestamp', 'Nama', 'No KP', 'Email', 'Jawatan', 'Unit', 'Tarikh', 'Masa', 'Markah', 'Jumlah Soalan', 'Peratus', 'Status', 'Masa Menjawab', 'Cubaan', 'Certificate ID', 'Submission ID', 'App Version']
  }
};

function doGet(e) {
  return route_(e);
}

function doPost(e) {
  return route_(e);
}

function route_(e) {
  var callback = getParam_(e, 'callback');
  try {
    var action = getParam_(e, 'action');
    var payload = parsePayload_(e);
    var result = handleAction_(action, payload);
    return respond_(result, callback);
  } catch (error) {
    return respond_({
      ok: false,
      message: error.message || 'Ralat Google Apps Script.'
    }, callback);
  }
}

function handleAction_(action, payload) {
  ensureSheets_();
  switch (action) {
    case 'saveAttendance':
      return saveAttendance_(payload.participant || {}, payload.appVersion || '');
    case 'saveScore':
      return saveScore_(payload.score || {}, payload.appVersion || '');
    case 'generateCertificate':
      return generateCertificate_(payload || {});
    case 'verifyCertificate':
      return verifyCertificate_(payload.certificateId || '');
    case 'getStatistics':
      return getStatistics_();
    case 'getParticipant':
      return getParticipant_(payload.noKp || '');
    default:
      return {
        ok: false,
        message: 'Action tidak sah.'
      };
  }
}

function saveAttendance_(participant, appVersion) {
  var item = normalizeParticipant_(participant);
  validateParticipant_(item);

  var sheet = getSheet_(CONFIG.SHEETS.ATTENDANCE, CONFIG.HEADERS.ATTENDANCE);
  var existing = findRowByValue_(sheet, 'No KP', item.noKp);
  if (existing.row > 0) {
    return {
      ok: true,
      duplicate: true,
      attendanceId: 'ATT-' + item.noKp,
      message: 'No KP telah didaftarkan. Pendaftaran diteruskan tanpa rekod kehadiran baharu.'
    };
  }

  var now = new Date();
  var row = [
    now,
    item.name,
    item.noKp,
    item.email,
    item.position,
    item.unit,
    formatDate_(now),
    formatTime_(now),
    participant.appVersion || appVersion || ''
  ];
  sheet.appendRow(row);

  return {
    ok: true,
    attendanceId: 'ATT-' + item.noKp,
    message: 'Rekod kehadiran berjaya disimpan.'
  };
}

function saveScore_(score, appVersion) {
  var item = normalizeParticipant_(score);
  validateParticipant_(item);

  var markah = Number(score.score);
  var total = Number(score.total);
  var percent = Number(score.percent);
  var attempt = Number(score.attempt || 1);
  if (!isFinite(markah) || !isFinite(total) || !isFinite(percent)) {
    throw new Error('Data markah tidak sah.');
  }

  var sheet = getSheet_(CONFIG.SHEETS.SCORES, CONFIG.HEADERS.SCORES);
  var submissionId = String(score.submissionId || item.noKp + '-' + Date.now());
  var duplicate = findRowByValue_(sheet, 'Submission ID', submissionId);
  if (duplicate.row > 0) {
    return {
      ok: true,
      duplicate: true,
      certificateId: duplicate.values['Certificate ID'] || '',
      message: 'Submission ID telah direkodkan.'
    };
  }

  var status = percent >= CONFIG.PASS_MARK ? 'LULUS' : 'GAGAL';
  var certificateId = status === 'LULUS' ? getExistingCertificateForNoKp_(item.noKp) : '';
  if (status === 'LULUS' && !certificateId) {
    certificateId = nextCertificateId_(sheet);
  }

  var now = new Date();
  sheet.appendRow([
    now,
    item.name,
    item.noKp,
    item.email,
    item.position,
    item.unit,
    formatDate_(now),
    formatTime_(now),
    markah,
    total,
    percent,
    status,
    score.durationText || String(score.durationSeconds || ''),
    attempt,
    certificateId,
    submissionId,
    score.appVersion || appVersion || ''
  ]);

  return {
    ok: true,
    certificateId: certificateId,
    status: status,
    message: 'Markah berjaya disimpan.'
  };
}

function generateCertificate_(payload) {
  var noKp = cleanNoKp_(payload.noKp);
  if (!noKp) {
    throw new Error('No KP diperlukan untuk jana sijil.');
  }

  var existing = getExistingCertificateForNoKp_(noKp);
  if (existing) {
    return {
      ok: true,
      certificateId: existing,
      message: 'Certificate ID sedia ada digunakan.'
    };
  }

  var latest = getLatestScoreForNoKp_(noKp);
  if (!latest || latest.status !== 'LULUS') {
    return {
      ok: false,
      message: 'Rekod markah lulus belum ditemui.'
    };
  }

  var sheet = getSheet_(CONFIG.SHEETS.SCORES, CONFIG.HEADERS.SCORES);
  var certificateId = nextCertificateId_(sheet);
  var header = headerMap_(sheet);
  sheet.getRange(latest.row, header['Certificate ID']).setValue(certificateId);

  return {
    ok: true,
    certificateId: certificateId,
    message: 'Certificate ID berjaya dijana.'
  };
}

function verifyCertificate_(certificateId) {
  var id = String(certificateId || '').trim().toUpperCase();
  if (!id) {
    throw new Error('Certificate ID diperlukan.');
  }

  var sheet = getSheet_(CONFIG.SHEETS.SCORES, CONFIG.HEADERS.SCORES);
  var found = findRowByValue_(sheet, 'Certificate ID', id);
  if (found.row < 1) {
    return {
      ok: true,
      found: false,
      message: 'Sijil tidak dijumpai.'
    };
  }

  return {
    ok: true,
    found: true,
    record: {
      name: found.values['Nama'] || '',
      date: found.values['Tarikh'] || '',
      score: found.values['Markah'] || '',
      percent: String(found.values['Peratus'] || '') + '%',
      status: found.values['Status'] || '',
      certificateId: found.values['Certificate ID'] || ''
    }
  };
}

function getStatistics_() {
  var attendance = objectsFromSheet_(getSheet_(CONFIG.SHEETS.ATTENDANCE, CONFIG.HEADERS.ATTENDANCE));
  var scores = objectsFromSheet_(getSheet_(CONFIG.SHEETS.SCORES, CONFIG.HEADERS.SCORES));
  var participants = {};

  attendance.forEach(function(row) {
    var noKp = cleanNoKp_(row['No KP']);
    if (!noKp) return;
    participants[noKp] = {
      name: row['Nama'] || '',
      noKp: noKp,
      email: row['Email'] || '',
      position: row['Jawatan'] || '',
      unit: row['Unit'] || '',
      percent: '',
      status: '',
      certificateId: ''
    };
  });

  scores.forEach(function(row) {
    var noKp = cleanNoKp_(row['No KP']);
    if (!noKp) return;
    if (!participants[noKp]) {
      participants[noKp] = {
        name: row['Nama'] || '',
        noKp: noKp,
        email: row['Email'] || '',
        position: row['Jawatan'] || '',
        unit: row['Unit'] || ''
      };
    }
    participants[noKp].percent = normalizePercent_(row['Peratus']);
    participants[noKp].status = row['Status'] || '';
    participants[noKp].certificateId = row['Certificate ID'] || '';
  });

  var users = Object.keys(participants).map(function(key) {
    return participants[key];
  });
  var attempted = users.filter(function(user) {
    return user.status;
  });
  var passed = attempted.filter(function(user) {
    return user.status === 'LULUS';
  }).length;
  var failed = attempted.filter(function(user) {
    return user.status === 'GAGAL';
  }).length;
  var average = attempted.length
    ? Math.round(attempted.reduce(function(total, user) {
      return total + Number(user.percent || 0);
    }, 0) / attempted.length)
    : 0;

  return {
    ok: true,
    statistics: {
      totalUsers: users.length,
      totalAttendance: attendance.length,
      averageScore: average,
      passed: passed,
      failed: failed,
      performance: performanceBuckets_(attempted),
      users: users
    }
  };
}

function getParticipant_(noKp) {
  var identity = cleanNoKp_(noKp);
  if (!identity) {
    throw new Error('No KP diperlukan.');
  }

  var attendance = objectsFromSheet_(getSheet_(CONFIG.SHEETS.ATTENDANCE, CONFIG.HEADERS.ATTENDANCE));
  var scores = objectsFromSheet_(getSheet_(CONFIG.SHEETS.SCORES, CONFIG.HEADERS.SCORES));
  var participant = null;

  attendance.forEach(function(row) {
    if (cleanNoKp_(row['No KP']) === identity) {
      participant = {
        name: row['Nama'] || '',
        noKp: identity,
        email: row['Email'] || '',
        position: row['Jawatan'] || '',
        unit: row['Unit'] || '',
        percent: '',
        status: '',
        certificateId: ''
      };
    }
  });

  scores.forEach(function(row) {
    if (cleanNoKp_(row['No KP']) === identity) {
      if (!participant) {
        participant = {
          name: row['Nama'] || '',
          noKp: identity,
          email: row['Email'] || '',
          position: row['Jawatan'] || '',
          unit: row['Unit'] || ''
        };
      }
      participant.percent = normalizePercent_(row['Peratus']);
      participant.status = row['Status'] || '';
      participant.certificateId = row['Certificate ID'] || '';
    }
  });

  return {
    ok: true,
    found: Boolean(participant),
    participant: participant
  };
}

function ensureSheets_() {
  getSheet_(CONFIG.SHEETS.ATTENDANCE, CONFIG.HEADERS.ATTENDANCE);
  getSheet_(CONFIG.SHEETS.SCORES, CONFIG.HEADERS.SCORES);
}

function getSpreadsheet_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('SPREADSHEET_ID');
  if (id) {
    return SpreadsheetApp.openById(id);
  }

  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) {
    spreadsheet = SpreadsheetApp.create(CONFIG.SPREADSHEET_NAME);
  }
  props.setProperty('SPREADSHEET_ID', spreadsheet.getId());
  return spreadsheet;
}

function getSheet_(name, headers) {
  var spreadsheet = getSpreadsheet_();
  var sheet = spreadsheet.getSheetByName(name) || spreadsheet.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    return sheet;
  }

  var existing = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  headers.forEach(function(header) {
    if (existing.indexOf(header) === -1) {
      sheet.getRange(1, sheet.getLastColumn() + 1).setValue(header);
    }
  });
  return sheet;
}

function normalizeParticipant_(item) {
  return {
    name: String(item.name || '').trim(),
    noKp: cleanNoKp_(item.noKp),
    email: String(item.email || '').trim(),
    position: String(item.position || '').trim(),
    unit: String(item.unit || '').trim()
  };
}

function validateParticipant_(item) {
  if (!item.name || !item.noKp || !item.email || !item.position || !item.unit) {
    throw new Error('Semua maklumat peserta wajib diisi.');
  }
  if (!/^\d{12}$/.test(item.noKp)) {
    throw new Error('No KP mesti 12 digit.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item.email)) {
    throw new Error('Email tidak sah.');
  }
}

function cleanNoKp_(value) {
  return String(value || '').replace(/\D/g, '');
}

function getParam_(e, name) {
  return e && e.parameter && e.parameter[name] ? String(e.parameter[name]) : '';
}

function parsePayload_(e) {
  var raw = getParam_(e, 'payload');
  if (!raw && e && e.postData && e.postData.contents) {
    raw = e.postData.contents;
  }
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (error) {
    return {};
  }
}

function respond_(data, callback) {
  var output = callback
    ? String(callback) + '(' + JSON.stringify(data) + ');'
    : JSON.stringify(data);
  return ContentService
    .createTextOutput(output)
    .setMimeType(callback ? ContentService.MimeType.JAVASCRIPT : ContentService.MimeType.JSON);
}

function headerMap_(sheet) {
  var values = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var map = {};
  values.forEach(function(header, index) {
    map[header] = index + 1;
  });
  return map;
}

function findRowByValue_(sheet, headerName, value) {
  var header = headerMap_(sheet);
  var column = header[headerName];
  if (!column || sheet.getLastRow() < 2) {
    return { row: -1, values: {} };
  }

  var target = String(value || '').trim().toUpperCase();
  var range = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  for (var i = 0; i < range.length; i += 1) {
    if (String(range[i][column - 1] || '').trim().toUpperCase() === target) {
      var values = {};
      headers.forEach(function(name, index) {
        values[name] = range[i][index];
      });
      return { row: i + 2, values: values };
    }
  }
  return { row: -1, values: {} };
}

function objectsFromSheet_(sheet) {
  if (sheet.getLastRow() < 2) return [];
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues().map(function(row) {
    var item = {};
    headers.forEach(function(header, index) {
      item[header] = row[index];
    });
    return item;
  });
}

function getExistingCertificateForNoKp_(noKp) {
  var sheet = getSheet_(CONFIG.SHEETS.SCORES, CONFIG.HEADERS.SCORES);
  var rows = objectsFromSheet_(sheet);
  for (var i = rows.length - 1; i >= 0; i -= 1) {
    if (cleanNoKp_(rows[i]['No KP']) === noKp && rows[i]['Certificate ID']) {
      return String(rows[i]['Certificate ID']);
    }
  }
  return '';
}

function getLatestScoreForNoKp_(noKp) {
  var sheet = getSheet_(CONFIG.SHEETS.SCORES, CONFIG.HEADERS.SCORES);
  var rows = objectsFromSheet_(sheet);
  for (var i = rows.length - 1; i >= 0; i -= 1) {
    if (cleanNoKp_(rows[i]['No KP']) === noKp) {
      return {
        row: i + 2,
        status: rows[i]['Status'],
        certificateId: rows[i]['Certificate ID'] || ''
      };
    }
  }
  return null;
}

function nextCertificateId_(sheet) {
  var rows = objectsFromSheet_(sheet);
  var max = 0;
  rows.forEach(function(row) {
    var id = String(row['Certificate ID'] || '');
    var match = id.match(/(\d+)$/);
    if (match) {
      max = Math.max(max, Number(match[1]));
    }
  });
  return CONFIG.CERTIFICATE_PREFIX + '-' + Utilities.formatString('%06d', max + 1);
}

function performanceBuckets_(users) {
  var buckets = [
    { label: '0-49', value: 0 },
    { label: '50-79', value: 0 },
    { label: '80-89', value: 0 },
    { label: '90-100', value: 0 }
  ];
  users.forEach(function(user) {
    var percent = Number(user.percent || 0);
    if (percent < 50) buckets[0].value += 1;
    else if (percent < 80) buckets[1].value += 1;
    else if (percent < 90) buckets[2].value += 1;
    else buckets[3].value += 1;
  });
  return buckets;
}

function normalizePercent_(value) {
  if (value === '' || value == null) return '';
  return Number(String(value).replace('%', '')) || 0;
}

function formatDate_(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone() || 'Asia/Kuala_Lumpur', 'dd/MM/yyyy');
}

function formatTime_(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone() || 'Asia/Kuala_Lumpur', 'HH:mm:ss');
}
