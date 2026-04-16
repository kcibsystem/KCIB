// ============================================================
// KCIB Backend — Google Apps Script v2.4
// Spreadsheet: 18nu0jZcDyyEJGfylpazITc5lK2gdb0u5rrmESQnPVZ4
// Deploy: Extensions > Apps Script > Deploy > New deployment
//   Execute as: Me | Who has access: Anyone
// ============================================================

const SHEET_ID = "18nu0jZcDyyEJGfylpazITc5lK2gdb0u5rrmESQnPVZ4";

const SHEETS = {
  BOOKINGS:  "ALlBooking",
  INVENTORY: "Inventory",
  HOLIDAYS:  "Holidays",
  STAFF:     "StaffConfig"
};

const STATUS = {
  PENDING_ADVISOR: "รอที่ปรึกษาอนุมัติ",
  PENDING_STEP2:   "รออนุมัติขั้นที่ 2",
  APPROVED:        "อนุมัติแล้ว",
  REJECTED:        "ปฏิเสธ",
  CANCELLED:       "ยกเลิก"
};

// ===================== HELPERS =====================
function ss_() { return SpreadsheetApp.openById(SHEET_ID); }
function sh_(name) { return ss_().getSheetByName(name); }

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
  const headers = rows[0].map(h => String(h).trim());
  return rows.slice(1).map((row, ri) => {
    const obj = { _row: ri + 2 };
    headers.forEach((h, i) => {
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
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => String(h).trim());
}

function colIdx_(headers, name) { return headers.indexOf(name); }

// ===================== ROUTER =====================
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

// ===================== INIT DATA =====================
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
  return rows.slice(1).map(row => {
    const raw = row[0];
    let dateStr;
    if (raw instanceof Date) {
      dateStr = Utilities.formatDate(raw, "Asia/Bangkok", "yyyy-MM-dd");
    } else {
      const s = String(raw).trim();
      if (s.includes("/")) {
        const parts = s.split("/");
        if (parts.length === 3) {
          const day   = parts[0].padStart(2, "0");
          const month = parts[1].padStart(2, "0");
          const year  = parseInt(parts[2]) > 2400 ? parseInt(parts[2]) - 543 : parseInt(parts[2]);
          dateStr = `${year}-${month}-${day}`;
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
  const config = {};
  rows.slice(1).forEach(row => {
    const role   = String(row[0] || "").trim();
    const emails = String(row[1] || "").split(",").map(e => e.trim()).filter(Boolean);
    const names  = String(row[2] || "").split(",").map(n => n.trim()).filter(Boolean);
    if (!role) return;
    config[role] = emails.map((email, i) => ({
      email,
      name: names[i] || email
    }));
  });
  return config;
}

// ===================== BOOKINGS =====================
function getMyBookings(email) {
  if (!email) return [];
  const all = sheetToObjects(SHEETS.BOOKINGS);
  return all.filter(b => String(b.Email || "").toLowerCase() === email.toLowerCase());
}

function getAllBookings() {
  return sheetToObjects(SHEETS.BOOKINGS);
}

// ===================== SUBMIT BOOKING =====================
function submitBooking(data) {
  const sheet = sh_(SHEETS.BOOKINGS);
  if (!sheet) throw new Error("Sheet 'ALlBooking' not found");

  const staffCfg     = getStaffConfig();
  const advisors     = staffCfg["ADVISORS"] || [];
  const chosenAdvisor = advisors.find(a => a.email === data.advisorEmail) || {};
  const advisorEmail  = chosenAdvisor.email || data.advisorEmail || "";
  const advisorName   = chosenAdvisor.name  || advisorEmail;

  const bookingId = "BK" + Date.now();

  const newRow = [
    new Date(),
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
    STATUS.PENDING_ADVISOR,
    advisorName
  ];

  sheet.appendRow(newRow);
  return { success: true, bookingId };
}

// ===================== CANCEL BOOKING =====================
function cancelBooking(data) {
  const sheet = sh_(SHEETS.BOOKINGS);
  if (!sheet) return { success: false, error: "Sheet not found" };

  const headers = getHeaders_(SHEETS.BOOKINGS);
  const allData = sheet.getDataRange().getValues();
  const bidCol  = colIdx_(headers, "BookingID");
  const emCol   = colIdx_(headers, "Email");
  const stCol   = colIdx_(headers, "Status") + 1;
  const caCol   = colIdx_(headers, "CurrentApproverName") + 1;

  let rowNo = -1;
  for (let i = 1; i < allData.length; i++) {
    const row = allData[i];
    if (
      String(row[bidCol]) === data.bookingId &&
      String(row[emCol]).toLowerCase() === (data.email || "").toLowerCase()
    ) {
      rowNo = i + 1;
      break;
    }
  }

  if (rowNo === -1) return { success: false, error: "Booking not found" };

  sheet.getRange(rowNo, stCol).setValue(STATUS.CANCELLED);
  sheet.getRange(rowNo, caCol).setValue("ยกเลิกโดยผู้จอง");
  return { success: true };
}

// ===================== APPROVE BOOKING =====================
function approveBooking(data) {
  const sheet = sh_(SHEETS.BOOKINGS);
  if (!sheet) return { success: false, error: "Sheet not found" };

  const headers = getHeaders_(SHEETS.BOOKINGS);
  const allData = sheet.getDataRange().getValues();
  const bidCol  = colIdx_(headers, "BookingID");
  const catCol  = colIdx_(headers, "Category");
  const crsCol  = colIdx_(headers, "Course");
  const stCol   = colIdx_(headers, "Status") + 1;
  const caCol   = colIdx_(headers, "CurrentApproverName") + 1;

  let rowNo = -1;
  for (let i = 1; i < allData.length; i++) {
    if (String(allData[i][bidCol]) === data.bookingId) { rowNo = i + 1; break; }
  }
  if (rowNo === -1) return { success: false, error: "Booking not found" };

  const rowData       = allData[rowNo - 1];
  const currentStatus = String(sheet.getRange(rowNo, stCol).getValue()).trim();
  const category      = String(rowData[catCol] || "");
  const course        = String(rowData[crsCol]  || "");

  if (currentStatus === STATUS.PENDING_ADVISOR) {
    const staffCfg     = getStaffConfig();
    const isInstr      = /instrument|analyt/i.test(category);
    const isTP2        = /team.?project.?2/i.test(course);
    let step2Approvers = [];
    if (isInstr)     step2Approvers = staffCfg["VIEWERS"]        || [];
    else if (isTP2)  step2Approvers = staffCfg["STAFF_PROJECT_2"] || [];
    else             step2Approvers = staffCfg["STAFF_FLOOR_1"]   || [];

    if (step2Approvers.length === 0) {
      sheet.getRange(rowNo, stCol).setValue(STATUS.APPROVED);
      sheet.getRange(rowNo, caCol).setValue("อนุมัติแล้ว");
    } else {
      sheet.getRange(rowNo, stCol).setValue(STATUS.PENDING_STEP2);
      sheet.getRange(rowNo, caCol).setValue(step2Approvers.map(a => a.name).join(", "));
    }
    return { success: true };
  }

  if (currentStatus === STATUS.PENDING_STEP2) {
    sheet.getRange(rowNo, stCol).setValue(STATUS.APPROVED);
    sheet.getRange(rowNo, caCol).setValue("อนุมัติแล้ว");
    return { success: true };
  }

  return { success: false, error: "ไม่สามารถอนุมัติสถานะนี้ได้: " + currentStatus };
}

// ===================== REJECT BOOKING =====================
function rejectBooking(data) {
  const sheet = sh_(SHEETS.BOOKINGS);
  if (!sheet) return { success: false, error: "Sheet not found" };

  const headers = getHeaders_(SHEETS.BOOKINGS);
  const allData = sheet.getDataRange().getValues();
  const bidCol  = colIdx_(headers, "BookingID");
  const stCol   = colIdx_(headers, "Status") + 1;
  const caCol   = colIdx_(headers, "CurrentApproverName") + 1;

  let rowNo = -1;
  for (let i = 1; i < allData.length; i++) {
    if (String(allData[i][bidCol]) === data.bookingId) { rowNo = i + 1; break; }
  }
  if (rowNo === -1) return { success: false, error: "Booking not found" };

  sheet.getRange(rowNo, stCol).setValue(STATUS.REJECTED);
  sheet.getRange(rowNo, caCol).setValue("ปฏิเสธ");
  return { success: true };
}
