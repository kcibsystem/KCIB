// ============================================================
// KCIB Backend — Google Apps Script
// Spreadsheet: 18nu0jZcDyyEJGfylpazITc5lK2gdb0u5rrmESQnPVZ4
// 3-Step Approval: ADVISORS → HEAD_DEPT → STAFF_FLOOR_1 / STAFF_PROJECT_2
//
// Deploy: Extensions > Apps Script > Deploy > New deployment
//   Execute as: Me | Who has access: Anyone
// ============================================================

const SHEET_ID      = "18nu0jZcDyyEJGfylpazITc5lK2gdb0u5rrmESQnPVZ4";
const KCIB_SITE_URL = "https://kcibsystem.github.io/KCIB/";

const SHEETS = {
  BOOKINGS:  "ALlBooking",
  INVENTORY: "Inventory",
  HOLIDAYS:  "Holidays",
  STAFF:     "StaffConfig",
  PROFILES:  "UserProfiles"
};

const STATUS = {
  P1:        "รอที่ปรึกษาอนุมัติ",
  P2:        "รออนุมัติขั้นที่ 2",
  P3:        "รออนุมัติขั้นที่ 3",
  APPROVED:  "อนุมัติแล้ว",
  REJECTED:  "ปฏิเสธ",
  CANCELLED: "ยกเลิก"
};

// ==================== HELPERS ====================
function ss_()        { return SpreadsheetApp.openById(SHEET_ID); }
function sh_(name)    { return ss_().getSheetByName(name); }

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function sheetToObjects(sheetName) {
  const sheet = sh_(sheetName);
  if (!sheet) return [];
  const rows = sheet.getDataRange().getValues();
  if (rows.length < 2) return [];
  const headers = rows[0].map(function(h) { return String(h).trim(); });
  return rows.slice(1).map(function(row, ri) {
    var obj = { _row: ri + 2 };
    headers.forEach(function(h, i) {
      obj[h] = row[i] instanceof Date
        ? Utilities.formatDate(row[i], "Asia/Bangkok", "yyyy-MM-dd'T'HH:mm:ss")
        : row[i];
    });
    return obj;
  });
}

function getHeaders_(sheetName) {
  const sheet = sh_(sheetName);
  if (!sheet) return [];
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function(h) { return String(h).trim(); });
}

function colIdx_(headers, name) { return headers.indexOf(name); }

// ==================== ROUTER ====================
function doGet(e) {
  const p = e.parameter || {};
  try {
    switch (p.func) {
      case "init":          return jsonOut(getInitData());
      case "getMyBookings": return jsonOut(getMyBookings(p.email));
      case "getAllBookings": return jsonOut(getAllBookings());
      case "getProfile":    return jsonOut(getProfile(p.email));
      default:              return jsonOut({ error: "Invalid function: " + (p.func || "(none)") });
    }
  } catch (err) {
    Logger.log("doGet error: " + err.stack);
    return jsonOut({ error: err.message });
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents || "{}");
    switch (data.action) {
      case "submitBooking":  return jsonOut(submitBooking(data));
      case "cancelBooking":  return jsonOut(cancelBooking(data));
      case "approveBooking": return jsonOut(approveBooking(data));
      case "rejectBooking":  return jsonOut(rejectBooking(data));
      case "saveProfile":    return jsonOut(saveProfile(data));
      default:               return jsonOut({ error: "Invalid action: " + data.action });
    }
  } catch (err) {
    Logger.log("doPost error: " + err.stack);
    return jsonOut({ error: err.message });
  }
}

// ==================== INIT DATA ====================
function getInitData() {
  return {
    inventory:   getInventory(),
    holidays:    getHolidays(),
    staffConfig: getStaffConfig()
  };
}

function getInventory() {
  return sheetToObjects(SHEETS.INVENTORY);
}

function getHolidays() {
  const sheet = sh_(SHEETS.HOLIDAYS);
  if (!sheet) return [];
  const rows = sheet.getDataRange().getValues();
  if (rows.length < 2) return [];
  return rows.slice(1).map(function(row) {
    var raw = row[0];
    var dateStr;
    if (raw instanceof Date) {
      dateStr = Utilities.formatDate(raw, "Asia/Bangkok", "yyyy-MM-dd");
    } else {
      var s = String(raw).trim();
      if (s.indexOf("/") !== -1) {
        var parts = s.split("/");
        if (parts.length === 3) {
          var day   = parts[0].length < 2 ? "0" + parts[0] : parts[0];
          var month = parts[1].length < 2 ? "0" + parts[1] : parts[1];
          var year  = parseInt(parts[2]) > 2400 ? parseInt(parts[2]) - 543 : parseInt(parts[2]);
          dateStr = year + "-" + month + "-" + day;
        } else dateStr = s;
      } else dateStr = s;
    }
    return { date: dateStr, description: String(row[1] || "") };
  });
}

function getStaffConfig() {
  const sheet = sh_(SHEETS.STAFF);
  if (!sheet) return {};
  const rows = sheet.getDataRange().getValues();
  if (rows.length < 2) return {};
  var config = {};
  rows.slice(1).forEach(function(row) {
    var role   = String(row[0] || "").trim();
    var emails = String(row[1] || "").split(",").map(function(e) { return e.trim(); }).filter(Boolean);
    var names  = String(row[2] || "").split(",").map(function(n) { return n.trim(); }).filter(Boolean);
    if (!role) return;
    config[role] = emails.map(function(email, i) {
      return { email: email, name: names[i] || email };
    });
  });
  return config;
}


// ==================== BOOKINGS ====================
function getMyBookings(email) {
  if (!email) return [];
  return sheetToObjects(SHEETS.BOOKINGS).filter(function(b) {
    return String(b.Email || "").toLowerCase() === email.toLowerCase();
  });
}

function getAllBookings() {
  return sheetToObjects(SHEETS.BOOKINGS);
}

// ==================== SUBMIT BOOKING ====================
function submitBooking(data) {
  const sheet = sh_(SHEETS.BOOKINGS);
  if (!sheet) throw new Error("Sheet 'ALlBooking' not found");

  // Check for double-booking: count active overlapping bookings vs MaxQuantity
  if (data.itemId && data.start && data.end) {
    var invItems = sheetToObjects(SHEETS.INVENTORY);
    var invItem  = invItems.filter(function(i) {
      return String(i.ID || i.Id || i.id || i._row) === String(data.itemId);
    })[0];
    var maxQty   = invItem ? (parseInt(invItem.MaxQuantity) || 1) : 1;

    var newStart = new Date(data.start);
    var newEnd   = new Date(data.end);
    var activeStatuses = [STATUS.P1, STATUS.P2, STATUS.P3, STATUS.APPROVED];

    var conflicting = sheetToObjects(SHEETS.BOOKINGS).filter(function(b) {
      if (String(b.ItemID) !== String(data.itemId)) return false;
      if (activeStatuses.indexOf(String(b.Status)) === -1) return false;
      var bStart = new Date(b.Start);
      var bEnd   = new Date(b.End);
      return newStart < bEnd && newEnd > bStart;
    });

    if (conflicting.length >= maxQty) {
      return {
        success: false,
        error: "เครื่องนี้ถูกจองเต็มแล้วในช่วงเวลาที่เลือก (" + conflicting.length + "/" + maxQty + " เครื่อง)"
      };
    }
  }

  const staffCfg      = getStaffConfig();
  const advisors      = staffCfg["ADVISORS"] || [];
  const chosenAdvisor = advisors.filter(function(a) { return a.email === data.advisorEmail; })[0] || {};
  const advisorEmail  = chosenAdvisor.email || data.advisorEmail || "";
  const advisorName   = chosenAdvisor.name  || advisorEmail;

  const bookingId = "BK" + Date.now();
  const now       = new Date();

  const newRow = [
    now,
    bookingId,
    data.email          || "",
    data.name           || "",
    data.category       || "",
    data.itemName       || "",
    data.itemId         || "",
    data.course         || "",
    data.quantity       || "",
    data.start          || "",
    data.end            || "",
    data.note           || "",
    advisorEmail,
    STATUS.P1,
    advisorName,
    data.studentId      || "",
    data.educationLevel || ""
  ];

  sheet.appendRow(newRow);

  return { success: true, bookingId: bookingId };
}

// ==================== CANCEL BOOKING ====================
function cancelBooking(data) {
  const sheet = sh_(SHEETS.BOOKINGS);
  if (!sheet) return { success: false, error: "Sheet not found" };

  const headers  = getHeaders_(SHEETS.BOOKINGS);
  const allData  = sheet.getDataRange().getValues();
  const bidCol   = colIdx_(headers, "BookingID");
  const emCol    = colIdx_(headers, "Email");
  const stCol    = colIdx_(headers, "Status") + 1;
  const caCol    = colIdx_(headers, "CurrentApproverName") + 1;

  var rowNo = -1;
  for (var i = 1; i < allData.length; i++) {
    if (
      String(allData[i][bidCol]) === data.bookingId &&
      String(allData[i][emCol]).toLowerCase() === (data.email || "").toLowerCase()
    ) { rowNo = i + 1; break; }
  }
  if (rowNo === -1) return { success: false, error: "Booking not found" };

  sheet.getRange(rowNo, stCol).setValue(STATUS.CANCELLED);
  sheet.getRange(rowNo, caCol).setValue("ยกเลิกโดยผู้จอง");
  return { success: true };
}

// ==================== APPROVE BOOKING ====================
function approveBooking(data) {
  const sheet = sh_(SHEETS.BOOKINGS);
  if (!sheet) return { success: false, error: "Sheet not found" };

  const headers  = getHeaders_(SHEETS.BOOKINGS);
  const allData  = sheet.getDataRange().getValues();
  const bidCol   = colIdx_(headers, "BookingID");
  const catCol   = colIdx_(headers, "Category");
  const crsCol   = colIdx_(headers, "Course");
  const emCol    = colIdx_(headers, "Email");
  const nmCol    = colIdx_(headers, "Name");
  const stCol    = colIdx_(headers, "Status") + 1;
  const caCol    = colIdx_(headers, "CurrentApproverName") + 1;

  var rowNo = -1;
  for (var i = 1; i < allData.length; i++) {
    if (String(allData[i][bidCol]) === data.bookingId) { rowNo = i + 1; break; }
  }
  if (rowNo === -1) return { success: false, error: "Booking not found" };

  const rowData       = allData[rowNo - 1];
  const currentStatus = String(sheet.getRange(rowNo, colIdx_(headers, "Status") + 1).getValue()).trim();
  const category      = String(rowData[catCol] || "");
  const course        = String(rowData[crsCol]  || "");
  const staffCfg      = getStaffConfig();
  const isTP2         = /team.?project.?2/i.test(course);
  const now           = new Date().toISOString();

  if (currentStatus === STATUS.P1) {
    // ADVISORS approved → advance to HEAD_DEPT (P2)
    const headDept = staffCfg["HEAD_DEPT"] || [];
    sheet.getRange(rowNo, stCol).setValue(STATUS.P2);
    sheet.getRange(rowNo, caCol).setValue(
      headDept.map(function(a) { return a.name; }).join(", ") || "หัวหน้าภาควิชา"
    );
    return { success: true };
  }

  if (currentStatus === STATUS.P2) {
    // HEAD_DEPT approved → advance to floor staff (P3)
    const nextRole  = isTP2 ? "STAFF_PROJECT_2" : "STAFF_FLOOR_1";
    const nextStaff = staffCfg[nextRole] || [];
    sheet.getRange(rowNo, stCol).setValue(STATUS.P3);
    sheet.getRange(rowNo, caCol).setValue(
      nextStaff.map(function(a) { return a.name; }).join(", ") || "เจ้าหน้าที่"
    );
    return { success: true };
  }

  if (currentStatus === STATUS.P3) {
    // Floor staff approved → APPROVED
    sheet.getRange(rowNo, stCol).setValue(STATUS.APPROVED);
    sheet.getRange(rowNo, caCol).setValue("อนุมัติแล้ว");
    return { success: true };
  }

  return { success: false, error: "ไม่สามารถอนุมัติสถานะนี้ได้: " + currentStatus };
}

// ==================== USER PROFILES ====================
function getProfile(email) {
  if (!email) return { studentId: "", educationLevel: "" };
  const lc = email.toLowerCase().trim();
  const sheet = sh_(SHEETS.PROFILES);
  if (!sheet) return { studentId: "", educationLevel: "" };
  const rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0] || "").toLowerCase().trim() === lc) {
      return { studentId: String(rows[i][1] || ""), educationLevel: String(rows[i][2] || "") };
    }
  }
  return { studentId: "", educationLevel: "" };
}

function saveProfile(data) {
  if (!data.email) return { success: false, error: "email required" };
  const lc = data.email.toLowerCase().trim();
  var sheet = sh_(SHEETS.PROFILES);
  if (!sheet) {
    sheet = ss_().insertSheet(SHEETS.PROFILES);
    sheet.appendRow(["Email", "StudentID", "EducationLevel", "UpdatedAt"]);
  }

  const rows  = sheet.getDataRange().getValues();
  const now   = new Date();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0] || "").toLowerCase().trim() === lc) {
      sheet.getRange(i + 1, 2).setValue(data.studentId      || "");
      sheet.getRange(i + 1, 3).setValue(data.educationLevel || "");
      sheet.getRange(i + 1, 4).setValue(now);
      return { success: true };
    }
  }
  sheet.appendRow([lc, data.studentId || "", data.educationLevel || "", now]);
  return { success: true };
}

// ==================== LINE NOTIFICATION ====================

// Status label map for LINE message
const STATUS_LABEL = {
  "รอที่ปรึกษาอนุมัติ": "รออาจารย์ที่ปรึกษาอนุมัติ",
  "รออนุมัติขั้นที่ 2":  "รอหัวหน้าภาควิชาอนุมัติ",
  "รออนุมัติขั้นที่ 3":  "รอเจ้าหน้าที่อนุมัติ"
};

// Order for grouping in message
const STATUS_ORDER = [
  STATUS.P1,
  STATUS.P2,
  STATUS.P3
];

function sendDailyLineReport() {
  const props      = PropertiesService.getScriptProperties();
  const token      = props.getProperty("LINE_TOKEN");
  const groupId    = props.getProperty("LINE_GROUP_ID");
  if (!token || !groupId) {
    Logger.log("LINE_TOKEN or LINE_GROUP_ID not set in Script Properties");
    return;
  }

  const pending = sheetToObjects(SHEETS.BOOKINGS).filter(function(b) {
    return STATUS_ORDER.indexOf(String(b.Status || "").trim()) !== -1;
  });

  if (pending.length === 0) return; // ไม่มีรายการค้าง ไม่ส่ง

  // Group by status
  var groups = {};
  STATUS_ORDER.forEach(function(s) { groups[s] = []; });
  pending.forEach(function(b) {
    var s = String(b.Status || "").trim();
    if (groups[s]) groups[s].push(b);
  });

  var today = Utilities.formatDate(new Date(), "Asia/Bangkok", "d MMM");
  var lines  = ["📋 KCIB — รายการจองรออนุมัติ (" + today + ")\n"];

  STATUS_ORDER.forEach(function(s) {
    var items = groups[s];
    if (items.length === 0) return;
    var label = STATUS_LABEL[s] || s;
    lines.push(label + " (" + items.length + " รายการ)");
    items.forEach(function(b) {
      var qty      = b.Quantity && b.Quantity > 1 ? " ×" + b.Quantity : "";
      var approver = s === STATUS.P1 ? " (" + (b.CurrentApproverName || b.AdvisorEmail || "") + ")" : "";
      lines.push("• [" + b.BookingID + "] " + (b.ItemName || "") + qty + " — " + (b.Name || b.Email || "") + approver);
    });
    lines.push(""); // blank line between groups
  });

  lines.push("🔗 " + KCIB_SITE_URL);

  var message = lines.join("\n").trim();

  var payload = JSON.stringify({
    to: groupId,
    messages: [{ type: "text", text: message }]
  });

  UrlFetchApp.fetch("https://api.line.me/v2/bot/message/push", {
    method: "post",
    contentType: "application/json",
    headers: { "Authorization": "Bearer " + token },
    payload: payload,
    muteHttpExceptions: true
  });
}

// Run this once manually to verify token + group ID are set correctly
function testLineReport() {
  sendDailyLineReport();
}

// ==================== REJECT BOOKING ====================
function rejectBooking(data) {
  const sheet = sh_(SHEETS.BOOKINGS);
  if (!sheet) return { success: false, error: "Sheet not found" };

  const headers  = getHeaders_(SHEETS.BOOKINGS);
  const allData  = sheet.getDataRange().getValues();
  const bidCol   = colIdx_(headers, "BookingID");
  const emCol    = colIdx_(headers, "Email");
  const nmCol    = colIdx_(headers, "Name");
  const stCol    = colIdx_(headers, "Status") + 1;
  const caCol    = colIdx_(headers, "CurrentApproverName") + 1;

  var rowNo = -1;
  for (var i = 1; i < allData.length; i++) {
    if (String(allData[i][bidCol]) === data.bookingId) { rowNo = i + 1; break; }
  }
  if (rowNo === -1) return { success: false, error: "Booking not found" };

  const rowData      = allData[rowNo - 1];
  const studentEmail = String(rowData[emCol] || "");
  const studentName  = String(rowData[nmCol]  || "");

  sheet.getRange(rowNo, stCol).setValue(STATUS.REJECTED);
  sheet.getRange(rowNo, caCol).setValue("ปฏิเสธ");

  return { success: true };
}

// ==================== SHEET FORMATTING ====================

const CATEGORY_OPTIONS = [
  "เครื่องแก้ว",
  "อุปกรณ์วิทยาศาสตร์",
  "เครื่องมือ",
  "เครื่องมือวิเคราะห์",
  "สารเคมี"
];

function formatAllSheets() {
  formatSheet_(SHEETS.BOOKINGS,  { statusCol: "Status", categoryCol: "Category" });
  formatSheet_(SHEETS.INVENTORY, { categoryCol: "Category" });
  formatSheet_(SHEETS.HOLIDAYS,  {});
  formatSheet_(SHEETS.STAFF,     {});
  formatSheet_(SHEETS.PROFILES,  {});
}

function formatSheet_(sheetName, options) {
  var sheet = sh_(sheetName);
  if (!sheet) return;

  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastCol === 0 || lastRow === 0) return;

  // Freeze header row
  sheet.setFrozenRows(1);

  // Remove existing bandings
  sheet.getBandings().forEach(function(b) { b.remove(); });

  // Apply banding (alternating row colors)
  var fullRange = sheet.getRange(1, 1, lastRow, lastCol);
  fullRange.applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY, true, false)
    .setHeaderRowColor("#1c4587")
    .setFirstRowColor("#ffffff")
    .setSecondRowColor("#e8eaf6");

  // Header: white bold text, taller row
  var header = sheet.getRange(1, 1, 1, lastCol);
  header
    .setFontColor("#ffffff")
    .setFontWeight("bold")
    .setFontSize(10)
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle")
    .setWrap(true);
  sheet.setRowHeight(1, 40);

  // Borders
  fullRange.setBorder(
    true, true, true, true, true, true,
    "#b0bec5", SpreadsheetApp.BorderStyle.SOLID
  );

  // Auto-resize columns (capped 60–280 px)
  for (var c = 1; c <= lastCol; c++) {
    sheet.autoResizeColumn(c);
    var w = sheet.getColumnWidth(c);
    if (w > 280) sheet.setColumnWidth(c, 280);
    if (w < 60)  sheet.setColumnWidth(c, 60);
  }

  // Conditional formatting by Status (ALlBooking only)
  if (options.statusCol && lastRow > 1) {
    var headers  = getHeaders_(sheetName);
    var sIdx     = headers.indexOf(options.statusCol);
    if (sIdx === -1) return;
    var colLetter = columnLetter_(sIdx + 1);
    var dataRange = sheet.getRange(2, 1, lastRow - 1, lastCol);

    var conditions = [
      { value: STATUS.APPROVED,  bg: "#c6efce", fg: "#276221" },
      { value: STATUS.P1,        bg: "#ffeb9c", fg: "#7d5a00" },
      { value: STATUS.P2,        bg: "#ffe0b2", fg: "#7f3f00" },
      { value: STATUS.P3,        bg: "#fff9c4", fg: "#615400" },
      { value: STATUS.REJECTED,  bg: "#ffc7ce", fg: "#9c0006" },
      { value: STATUS.CANCELLED, bg: "#ededed", fg: "#636363" }
    ];

    var rules = conditions.map(function(cond) {
      return SpreadsheetApp.newConditionalFormatRule()
        .whenFormulaSatisfied('=$' + colLetter + '2="' + cond.value + '"')
        .setBackground(cond.bg)
        .setFontColor(cond.fg)
        .setRanges([dataRange])
        .build();
    });

    sheet.setConditionalFormatRules(rules);
  }

  // Category dropdown validation
  if (options.categoryCol && lastRow > 1) {
    var allHeaders = getHeaders_(sheetName);
    var cIdx = allHeaders.indexOf(options.categoryCol);
    if (cIdx !== -1) {
      var catRange = sheet.getRange(2, cIdx + 1, Math.max(lastRow - 1, 500), 1);
      var rule = SpreadsheetApp.newDataValidation()
        .requireValueInList(CATEGORY_OPTIONS, true)
        .setAllowInvalid(false)
        .setHelpText("เลือกหมวดหมู่จากรายการ")
        .build();
      catRange.setDataValidation(rule);
    }
  }
}

function columnLetter_(col) {
  var letter = '';
  while (col > 0) {
    var rem = (col - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    col = Math.floor((col - 1) / 26);
  }
  return letter;
}

