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
  if (p.action === "process_email") {
    return handleEmailAction(p.type, p.bookingId, p.staffEmail || "");
  }
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

function getStaffEmailsForRole(role) {
  var cfg = getStaffConfig();
  return (cfg[role] || []).map(function(a) { return a.email; });
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

  // Notify advisor by email
  try {
    sendAdvisorEmail(bookingId, {
      studentEmail: data.email    || "",
      studentName:  data.name     || "",
      course:       data.course   || "",
      advisorEmail: advisorEmail,
      advisorName:  advisorName,
      itemName:     data.itemName || "",
      category:     data.category || "",
      start:        data.start    || "",
      end:          data.end      || "",
      quantity:     data.quantity || "",
      note:         data.note     || ""
    });
  } catch(e) { Logger.log("sendAdvisorEmail error: " + e); }

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
    // ADVISORS approved → notify HEAD_DEPT (P2)
    const headDept = staffCfg["HEAD_DEPT"] || [];
    sheet.getRange(rowNo, stCol).setValue(STATUS.P2);
    sheet.getRange(rowNo, caCol).setValue(
      headDept.map(function(a) { return a.name; }).join(", ") || "หัวหน้าภาควิชา"
    );
    try { sendStepEmail("HEAD_DEPT", STATUS.P2, data.bookingId, rowData, headers, staffCfg); } catch(e) { Logger.log(e); }
    return { success: true };
  }

  if (currentStatus === STATUS.P2) {
    // HEAD_DEPT approved → notify floor staff (P3)
    const nextRole    = isTP2 ? "STAFF_PROJECT_2" : "STAFF_FLOOR_1";
    const nextStaff   = staffCfg[nextRole] || [];
    sheet.getRange(rowNo, stCol).setValue(STATUS.P3);
    sheet.getRange(rowNo, caCol).setValue(
      nextStaff.map(function(a) { return a.name; }).join(", ") || "เจ้าหน้าที่"
    );
    try { sendStepEmail(nextRole, STATUS.P3, data.bookingId, rowData, headers, staffCfg); } catch(e) { Logger.log(e); }
    return { success: true };
  }

  if (currentStatus === STATUS.P3) {
    // Floor staff approved → APPROVED, notify student + VIEWERS
    sheet.getRange(rowNo, stCol).setValue(STATUS.APPROVED);
    sheet.getRange(rowNo, caCol).setValue("อนุมัติแล้ว");
    const studentEmail = String(rowData[emCol] || "");
    const studentName  = String(rowData[nmCol]  || "");
    try { sendApprovedEmail(studentEmail, studentName, data.bookingId, rowData, headers); } catch(e) { Logger.log(e); }
    try { sendViewersNotify(data.bookingId, rowData, headers, staffCfg); } catch(e) { Logger.log(e); }
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

  try { sendRejectedEmail(studentEmail, studentName, data.bookingId, rowData, headers, data.notes || ""); } catch(e) { Logger.log(e); }

  return { success: true };
}

// ==================== EMAIL ACTION (links in email) ====================
function handleEmailAction(type, bookingId, staffEmail) {
  try {
    var result = type === "approve"
      ? approveBooking({ bookingId: bookingId, staffEmail: staffEmail })
      : rejectBooking({ bookingId: bookingId, staffEmail: staffEmail });

    var msg = (result.success || result.ok)
      ? (type === "approve" ? "✅ อนุมัติสำเร็จ" : "❌ ปฏิเสธสำเร็จ")
      : "เกิดข้อผิดพลาด: " + (result.error || "");

    return HtmlService.createHtmlOutput(
      "<html><body style=\"font-family:sans-serif;text-align:center;padding:60px;\">"
      + "<h2>" + msg + "</h2>"
      + "<p>Booking ID: " + bookingId + "</p>"
      + "<a href=\"" + KCIB_SITE_URL + "\">กลับสู่ระบบ KCIB</a>"
      + "</body></html>"
    );
  } catch(e) {
    return HtmlService.createHtmlOutput("<p>Error: " + e.message + "</p>");
  }
}

// ==================== EMAIL TEMPLATES ====================
function emailWrap(title, body) {
  return "<!DOCTYPE html><html><body style=\"margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;\">"
    + "<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#f3f4f6;padding:32px 0;\">"
    + "<tr><td align=\"center\">"
    + "<table width=\"600\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);\">"
    + "<tr><td style=\"background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:28px 32px;\">"
    + "<h1 style=\"margin:0;color:#fff;font-size:22px;\">KCIB — ระบบจองเครื่องมือ</h1>"
    + "<p style=\"margin:4px 0 0;color:#bfdbfe;font-size:13px;\">ภาควิชาวิศวกรรมเคมี สจล.</p>"
    + "</td></tr>"
    + "<tr><td style=\"padding:28px 32px;\">"
    + "<h2 style=\"margin:0 0 16px;color:#1e3a5f;font-size:18px;\">" + title + "</h2>"
    + body
    + "</td></tr>"
    + "<tr><td style=\"background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;\">"
    + "<p style=\"margin:0;color:#9ca3af;font-size:12px;\">อีเมลนี้ถูกส่งโดยอัตโนมัติจากระบบ KCIB — กรุณาอย่าตอบกลับ</p>"
    + "</td></tr>"
    + "</table></td></tr></table></body></html>";
}

function bookingInfoTable(rowData, headers) {
  function val(col) {
    var idx = colIdx_(headers, col);
    return idx >= 0 ? String(rowData[idx] || "") : "";
  }
  var fields = [
    ["Booking ID",       val("BookingID")],
    ["ผู้ขอ",             val("Name") + " (" + val("Email") + ")"],
    ["รายวิชา",           val("Course")],
    ["อาจารย์ที่ปรึกษา",   val("AdvisorEmail")],
    ["รายการ",            val("ItemName")],
    ["ประเภท",            val("Category")],
    ["วันที่เริ่ม",         val("Start")],
    ["วันที่สิ้นสุด",       val("End")],
    ["ช่วงเวลา",           val("Slot")],
    ["จำนวน",             val("Quantity")],
    ["วัตถุประสงค์",       val("Note")],
  ];
  if (val("Amount"))        fields.push(["ปริมาณ",      val("Amount")]);
  if (val("Grade"))         fields.push(["เกรด",        val("Grade")]);
  if (val("Concentration")) fields.push(["ความเข้มข้น",  val("Concentration")]);

  var trs = fields.filter(function(f) { return f[1]; }).map(function(f) {
    return "<tr>"
      + "<td style=\"padding:8px 12px;background:#f9fafb;font-weight:600;color:#374151;white-space:nowrap;border:1px solid #e5e7eb;font-size:14px;\">" + f[0] + "</td>"
      + "<td style=\"padding:8px 12px;color:#111827;border:1px solid #e5e7eb;font-size:14px;\">" + f[1] + "</td>"
      + "</tr>";
  }).join("");

  return "<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"border-collapse:collapse;margin:16px 0;\">" + trs + "</table>";
}

function btn(label, href, color) {
  return "<a href=\"" + href + "\" style=\"display:inline-block;padding:12px 28px;background:" + color + ";color:#fff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:600;margin:4px;\">" + label + "</a>";
}

// ==================== EMAIL: Notify advisor (Step 1) ====================
function sendAdvisorEmail(bookingId, d) {
  var advisorEmail = d.advisorEmail;
  if (!advisorEmail || advisorEmail.indexOf("@") === -1) return;

  var scriptUrl   = ScriptApp.getService().getUrl();
  var approveLink = scriptUrl + "?action=process_email&type=approve&bookingId=" + bookingId + "&staffEmail=" + encodeURIComponent(advisorEmail);
  var rejectLink  = scriptUrl + "?action=process_email&type=reject&bookingId="  + bookingId + "&staffEmail=" + encodeURIComponent(advisorEmail);

  var fields = [
    ["Booking ID",   bookingId],
    ["นักศึกษา",      d.studentName + " (" + d.studentEmail + ")"],
    ["รายวิชา",       d.course],
    ["รายการ",        d.itemName],
    ["ประเภท",        d.category],
    ["วันที่เริ่ม",     d.start],
    ["วันที่สิ้นสุด",   d.end || d.start],
    ["จำนวน",         d.quantity],
    ["วัตถุประสงค์",   d.note],
  ];

  var trs = fields.filter(function(f) { return f[1]; }).map(function(f) {
    return "<tr>"
      + "<td style=\"padding:8px 12px;background:#f9fafb;font-weight:600;color:#374151;white-space:nowrap;border:1px solid #e5e7eb;font-size:14px;\">" + f[0] + "</td>"
      + "<td style=\"padding:8px 12px;color:#111827;border:1px solid #e5e7eb;font-size:14px;\">" + f[1] + "</td>"
      + "</tr>";
  }).join("");

  var table = "<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"border-collapse:collapse;margin:16px 0;\">" + trs + "</table>";

  var body = "<p>มีคำขอจองเครื่องมือใหม่รอการอนุมัติจากท่าน</p>"
    + table
    + "<p style=\"margin-top:24px;font-weight:600;color:#374151;\">กรุณาดำเนินการ:</p>"
    + "<p>"
    + btn("✅ อนุมัติ", approveLink, "#16a34a")
    + btn("❌ ปฏิเสธ", rejectLink,  "#dc2626")
    + "</p>"
    + "<p style=\"color:#6b7280;font-size:13px;\">หรือเข้าสู่ระบบที่ <a href=\"" + KCIB_SITE_URL + "\">" + KCIB_SITE_URL + "</a></p>";

  MailApp.sendEmail({
    to:       advisorEmail,
    subject:  "[KCIB] คำขอจองใหม่ — " + d.itemName + " (ID: " + bookingId + ")",
    htmlBody: emailWrap("มีคำขอจองรอการอนุมัติ", body)
  });
}

// ==================== EMAIL: Notify next-step staff ====================
function sendStepEmail(role, newStatus, bookingId, rowData, headers, staffCfg) {
  var emails = (staffCfg[role] || []).map(function(a) { return a.email; });
  if (!emails.length) return;

  var stepLabel = newStatus === STATUS.P2 ? "ขั้นที่ 2 (หัวหน้าภาควิชา)" : "ขั้นที่ 3 (เจ้าหน้าที่)";
  var body = "<p>คำขอจองเครื่องมือผ่านขั้นตอนก่อนหน้าแล้ว กรุณาตรวจสอบและดำเนินการอนุมัติ<strong>" + stepLabel + "</strong></p>"
    + bookingInfoTable(rowData, headers)
    + "<p style=\"margin-top:24px;\">"
    + btn("เข้าสู่แดชบอร์ด", KCIB_SITE_URL + "#dashboard", "#2563eb")
    + "</p>";

  var itemName = String(rowData[colIdx_(headers, "ItemName")] || "");
  MailApp.sendEmail({
    to:       emails.join(","),
    subject:  "[KCIB] รออนุมัติ" + stepLabel + " — " + itemName + " (ID: " + bookingId + ")",
    htmlBody: emailWrap("รออนุมัติ" + stepLabel, body)
  });
}

// ==================== EMAIL: Approved — notify student ====================
function sendApprovedEmail(studentEmail, studentName, bookingId, rowData, headers) {
  if (!studentEmail) return;

  var itemName = String(rowData[colIdx_(headers, "ItemName")] || "");
  var body = "<p>ยินดีด้วย! คำขอจองเครื่องมือของท่านได้รับการ<strong style=\"color:#16a34a;\">อนุมัติแล้ว</strong> 🎉</p>"
    + bookingInfoTable(rowData, headers)
    + "<p style=\"background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 16px;color:#15803d;margin-top:16px;\">"
    + "กรุณาติดต่อเจ้าหน้าที่เพื่อรับเครื่องมือตามวันและเวลาที่กำหนด</p>"
    + "<p>" + btn("ดูสถานะการจอง", KCIB_SITE_URL + "#my-bookings", "#2563eb") + "</p>";

  MailApp.sendEmail({
    to:       studentEmail,
    subject:  "[KCIB] ✅ อนุมัติแล้ว — " + itemName + " (ID: " + bookingId + ")",
    htmlBody: emailWrap("คำขอจองได้รับการอนุมัติ", body)
  });
}

// ==================== EMAIL: Rejected — notify student ====================
function sendRejectedEmail(studentEmail, studentName, bookingId, rowData, headers, reason) {
  if (!studentEmail) return;

  var itemName = String(rowData[colIdx_(headers, "ItemName")] || "");
  var reasonBlock = reason
    ? "<p style=\"background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px 16px;color:#b91c1c;margin-top:16px;\"><strong>เหตุผล:</strong> " + reason + "</p>"
    : "";

  var body = "<p>เสียใจด้วย คำขอจองเครื่องมือของท่านถูก<strong style=\"color:#dc2626;\">ปฏิเสธ</strong></p>"
    + bookingInfoTable(rowData, headers)
    + reasonBlock
    + "<p>" + btn("ดูสถานะการจอง", KCIB_SITE_URL + "#my-bookings", "#2563eb") + "</p>";

  MailApp.sendEmail({
    to:       studentEmail,
    subject:  "[KCIB] ❌ ปฏิเสธ — " + itemName + " (ID: " + bookingId + ")",
    htmlBody: emailWrap("คำขอจองถูกปฏิเสธ", body)
  });
}

// ==================== EMAIL: Notify VIEWERS on final approval ====================
function sendViewersNotify(bookingId, rowData, headers, staffCfg) {
  var emails = (staffCfg["VIEWERS"] || []).map(function(a) { return a.email; });
  if (!emails.length) return;

  var itemName = String(rowData[colIdx_(headers, "ItemName")] || "");
  var body = "<p>คำขอจองเครื่องมือได้รับการ<strong>อนุมัติแล้ว</strong></p>"
    + bookingInfoTable(rowData, headers);

  MailApp.sendEmail({
    to:       emails.join(","),
    subject:  "[KCIB] แจ้งเตือน: อนุมัติแล้ว — " + itemName + " (ID: " + bookingId + ")",
    htmlBody: emailWrap("แจ้งเตือนการอนุมัติขั้นสุดท้าย", body)
  });
}

// ==================== DAILY REMINDER DIGEST ====================
function setupDailyTrigger() {
  // Run this function ONCE manually from the Apps Script editor (Run > setupDailyTrigger)
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "sendDailyReminderDigest") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  ScriptApp.newTrigger("sendDailyReminderDigest")
    .timeBased().atHour(12).everyDays(1).create();
  Logger.log("Daily digest trigger set for 12:00 every day.");
}

function sendDailyReminderDigest() {
  var allBookings = sheetToObjects(SHEETS.BOOKINGS);
  var pending = allBookings.filter(function(b) {
    return b.Status === STATUS.P1 || b.Status === STATUS.P2 || b.Status === STATUS.P3;
  });
  if (!pending.length) return;

  var tableRows = pending.map(function(b) {
    return "<tr>"
      + "<td style=\"padding:6px 10px;border:1px solid #e5e7eb;font-size:13px;\">" + (b.BookingID || "")    + "</td>"
      + "<td style=\"padding:6px 10px;border:1px solid #e5e7eb;font-size:13px;\">" + (b.Name || "")         + "</td>"
      + "<td style=\"padding:6px 10px;border:1px solid #e5e7eb;font-size:13px;\">" + (b.ItemName || "")     + "</td>"
      + "<td style=\"padding:6px 10px;border:1px solid #e5e7eb;font-size:13px;\">" + (b.Status || "")       + "</td>"
      + "<td style=\"padding:6px 10px;border:1px solid #e5e7eb;font-size:13px;\">" + (b.Start || "")        + "</td>"
      + "</tr>";
  }).join("");

  var body = "<p>มีคำขอจองเครื่องมือที่ค้างอยู่ทั้งหมด <strong>" + pending.length + " รายการ</strong> รอการดำเนินการ</p>"
    + "<table width=\"100%\" style=\"border-collapse:collapse;margin:16px 0;\">"
    + "<tr style=\"background:#f3f4f6;\">"
    + "<th style=\"padding:8px 10px;border:1px solid #e5e7eb;text-align:left;font-size:13px;\">ID</th>"
    + "<th style=\"padding:8px 10px;border:1px solid #e5e7eb;text-align:left;font-size:13px;\">ผู้ขอ</th>"
    + "<th style=\"padding:8px 10px;border:1px solid #e5e7eb;text-align:left;font-size:13px;\">รายการ</th>"
    + "<th style=\"padding:8px 10px;border:1px solid #e5e7eb;text-align:left;font-size:13px;\">สถานะ</th>"
    + "<th style=\"padding:8px 10px;border:1px solid #e5e7eb;text-align:left;font-size:13px;\">วันที่</th>"
    + "</tr>" + tableRows + "</table>"
    + "<p>" + btn("เข้าสู่แดชบอร์ด", KCIB_SITE_URL + "#dashboard", "#2563eb") + "</p>";

  var allEmails = new Set ? new Set() : [];
  var staffCfg = getStaffConfig();
  ["ADVISORS","HEAD_DEPT","STAFF_FLOOR_1","STAFF_PROJECT_2","VIEWERS"].forEach(function(role) {
    (staffCfg[role] || []).forEach(function(a) {
      if (typeof allEmails.add === "function") allEmails.add(a.email);
      else if (allEmails.indexOf(a.email) === -1) allEmails.push(a.email);
    });
  });

  var emailList = typeof allEmails.size !== "undefined"
    ? Array.from(allEmails)
    : allEmails;

  if (emailList.length) {
    MailApp.sendEmail({
      to:       emailList.join(","),
      subject:  "[KCIB] สรุปรายวัน — รอดำเนินการ " + pending.length + " รายการ",
      htmlBody: emailWrap("สรุปคำขอจองที่รอดำเนินการประจำวัน", body)
    });
  }
}
