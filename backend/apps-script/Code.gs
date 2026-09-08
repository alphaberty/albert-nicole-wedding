/**
 * Wedding response collector — Google Apps Script bound to a Google Sheet.
 *
 * Paste this into Extensions → Apps Script of the responses spreadsheet, then
 * Deploy → New deployment → Web app, "Execute as: Me", "Who has access: Anyone".
 * The resulting /exec URL is the value for VITE_RESPONSES_ENDPOINT.
 *
 * Each request carries a submissionId generated in the guest's browser. Rows
 * are appended only for ids not yet seen, so a double-click or a retry after a
 * timeout never creates a duplicate. Several guests may share one email.
 */

var SHEET_NAME = 'Responses';
var HEADERS = [
  'Submitted at (SGT)',
  'Name',
  'Email',
  'Main course',
  'Main course label',
  'After-party',
  'Dietary notes',
  'Submission ID',
  'Client time (UTC)',
];

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
  } catch (err) {
    return json_({ ok: false, error: 'Busy, please try again.' });
  }
  try {
    var body = (e && e.postData && e.postData.contents) || '';
    var data = JSON.parse(body);

    var name = clean_(data.name, 120);
    var email = clean_(data.email, 160).toLowerCase();
    var mainCourse = clean_(data.mainCourse, 40);
    var mainCourseLabel = clean_(data.mainCourseLabel, 120);
    var afterParty = clean_(data.afterParty, 10);
    var dietary = clean_(data.dietary, 500);
    var submissionId = clean_(data.submissionId, 80);
    var clientTime = clean_(data.submittedAt, 40);

    if (name.length < 2) return json_({ ok: false, error: 'Please enter your full name.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return json_({ ok: false, error: 'Please enter a valid email address.' });
    if (!mainCourse) return json_({ ok: false, error: 'Please choose a main course.' });
    if (afterParty !== 'yes' && afterParty !== 'no') return json_({ ok: false, error: 'Please answer the after-party question.' });
    if (!submissionId) return json_({ ok: false, error: 'Missing submission id.' });

    var sheet = getSheet_();
    var idColumn = HEADERS.indexOf('Submission ID') + 1;
    var lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      var ids = sheet.getRange(2, idColumn, lastRow - 1, 1).getValues();
      for (var i = 0; i < ids.length; i++) {
        if (String(ids[i][0]) === submissionId) return json_({ ok: true, duplicate: true });
      }
    }

    var stamp = Utilities.formatDate(new Date(), 'Asia/Singapore', 'yyyy-MM-dd HH:mm:ss');
    sheet.appendRow([
      stamp,
      safeCell_(name),
      safeCell_(email),
      safeCell_(mainCourse),
      safeCell_(mainCourseLabel),
      afterParty,
      safeCell_(dietary),
      safeCell_(submissionId),
      safeCell_(clientTime),
    ]);
    return json_({ ok: true, duplicate: false });
  } catch (err) {
    return json_({ ok: false, error: 'Could not save the response. Please try again.' });
  } finally {
    lock.releaseLock();
  }
}

/** Health check: open the /exec URL in a browser to confirm the deployment. */
function doGet() {
  return json_({ ok: true, service: 'wedding-responses' });
}

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function clean_(value, max) {
  if (value === undefined || value === null) return '';
  var control = new RegExp('[' + String.fromCharCode(0) + '-' + String.fromCharCode(31) + String.fromCharCode(127) + ']', 'g');
  return String(value).replace(control, '').trim().slice(0, max);
}

/** Stops spreadsheet formula injection from user-typed text. */
function safeCell_(value) {
  if (/^[=+\-@]/.test(value)) return "'" + value;
  return value;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
