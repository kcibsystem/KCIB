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
  STAFF:     "StaffConfig"
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
    data.email    || "",
    data.name     || "",
    data.category || "",
    data.itemName || "",
    data.itemId   || "",
    data.course   || "",
    data.quantity || "",
    data.start    || "",
    data.end      || "",
    data.note     || "",
    advisorEmail,
    STATUS.P1,
    advisorName
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

