// ============================================================
// KCIB Backend — Google Apps Script v2.3 (FULL VERSION)
// Spreadsheet: 18nu0jZcDyyEJGfylpazITc5lK2gdb0u5rrmESQnPVZ4
// Deploy: Extensions > Apps Script > Deploy > New deployment
//   Execute as: Me | Who has access: Anyone
// ============================================================

const SHEET_ID    = "18nu0jZcDyyEJGfylpazITc5lK2gdb0u5rrmESQnPVZ4";
const KCIB_SITE_URL = "https://kcibsystem.github.io/KCIB/"; 

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

  // 1. ระบบ Chatbot
  if (p.action === "chat") {
    return chatWithGemini(p.message);
  }

  // 2. Email approval link handler
  if (p.action === "process_email") {
    return handleEmailAction(p.type, p.bookingId);
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
      case "submitBooking": return jsonOut(submitBooking(data));
      case "cancelBooking": return jsonOut(cancelBooking(data));
      case "chat":          return chatWithGemini(data.message);
      default:              return jsonOut({ error: "Invalid action: " + data.action });
    }
  } catch (err) {
    Logger.log("doPost error: " + err.stack);
    return jsonOut({ error: err.message });
  }
}

// ===================== GEMINI AI FUNCTION =====================
function chatWithGemini(userMessage) {
  const API_KEY = "AIzaSyCUeQYZMC3uiq2h6hZyJ2QVjtI-NLXMp4A";
  const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + API_KEY;

  const payload = {
    system_instruction: {
      parts: [{ text: "คุณคือผู้ช่วย AI ของระบบ KCIB (KMITL ChE Inventory & Booking) ภาควิชาวิศวกรรมเคมี สจล. ให้ข้อมูลที่สุภาพ เป็นกันเอง และช่วยเหลือผู้ใช้งาน" }]
    },
    contents: [
      { role: "user", parts: [{ text: userMessage }] }
    ],
    generationConfig: { temperature: 0.7 }
  };

  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const data = JSON.parse(response.getContentText());
    if (data.candidates && data.candidates[0].content.parts[0].text) {
      const reply = data.candidates[0].content.parts[0].text;
      return jsonOut({ status: 'success', reply: reply });
    } else {
      throw new Error("Gemini Error: " + (data.error ? data.error.message : "Unknown error"));
    }
  } catch (err) {
    return jsonOut({ status: 'error', message: err.toString() });
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

  const staffCfg  = getStaffConfig();
  const advisors  = staffCfg["ADVISORS"] || [];

  const chosenAdvisor = advisors.find(a => a.email === data.advisorEmail) || {};
  const advisorEmail  = chosenAdvisor.email || data.advisorEmail || "";
  const advisorName   = chosenAdvisor.name  || advisorEmail;

  const bookingId = "BK" + Date.now();

  const newRow = [
    new Date(),
    bookingId,
    data.email        || "",
    data.name         || "",
    data.category     || "",
    data.itemName     || "",
    data.itemId       || "",
    data.course       || "",
    data.quantity     || "",
    data.start        || "",
    data.end          || "",
    data.note         || "",
    advisorEmail,
    STATUS.PENDING_ADVISOR,
    advisorName
  ];

  sheet.appendRow(newRow);

  if (advisorEmail) {
    const bookingObj = {
      bookingId, email: data.email, name: data.name,
      category: data.category, itemName: data.itemName, itemId: data.itemId,
      course: data.course, quantity: data.quantity,
      start: data.start, end: data.end, note: data.note
    };
    sendApprovalEmail_(bookingObj, [{ email: advisorEmail, name: advisorName }]);
  }

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

// ===================== EMAIL APPROVAL HANDLER =====================
function handleEmailAction(type, bookingId) {
  if (!bookingId) return renderResultPage_("เกิดข้อผิดพลาด", "ไม่พบ BookingID", "❌");

  try {
    const sheet   = sh_(SHEETS.BOOKINGS);
    const headers = getHeaders_(SHEETS.BOOKINGS);
    const bidCol  = colIdx_(headers, "BookingID") + 1;
    const stCol   = colIdx_(headers, "Status") + 1;
    const caCol   = colIdx_(headers, "CurrentApproverName") + 1;

    const data  = sheet.getDataRange().getValues();
    let rowNo = -1;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][bidCol - 1]) === bookingId) { rowNo = i + 1; break; }
    }
    if (rowNo === -1) return renderResultPage_("ไม่พบรายการ", "ไม่พบการจอง ID: " + bookingId, "❌");

    const currentStatus = String(sheet.getRange(rowNo, stCol).getValue()).trim();

    if ([STATUS.APPROVED, STATUS.REJECTED, STATUS.CANCELLED].includes(currentStatus)) {
      return renderResultPage_("ดำเนินการไปแล้ว", "การจองนี้ถูกดำเนินการไปแล้ว", "⚠️");
    }

    const rowData = data[rowNo - 1];
    const booking = {};
    headers.forEach((h, i) => {
      booking[h] = rowData[i] instanceof Date ? rowData[i].toISOString() : rowData[i];
    });
    const staffCfg = getStaffConfig();

    if (type === "reject") {
      sheet.getRange(rowNo, stCol).setValue(STATUS.REJECTED);
      sheet.getRange(rowNo, caCol).setValue("ปฏิเสธ");
      sendStudentNotifyEmail_(booking, "rejected");
      return renderResultPage_("ปฏิเสธการจองสำเร็จ", `ปฏิเสธการจอง "${booking.ItemName}" เรียบร้อยแล้ว`, "🚫");
    }

    if (currentStatus === STATUS.PENDING_ADVISOR) {
      return approveStep1_(sheet, rowNo, stCol, caCol, booking, staffCfg);
    }
    if (currentStatus === STATUS.PENDING_STEP2) {
      return approveStep2_(sheet, rowNo, stCol, caCol, booking, staffCfg);
    }

    return renderResultPage_("เกิดข้อผิดพลาด", "สถานะไม่ถูกต้อง: " + currentStatus, "❌");

  } catch (err) {
    Logger.log("handleEmailAction error: " + err.stack);
    return renderResultPage_("เกิดข้อผิดพลาด", err.message, "❌");
  }
}

function approveStep1_(sheet, rowNo, stCol, caCol, booking, staffCfg) {
  const category = String(booking.Category || "");
  const course   = String(booking.Course   || "");
  const isInstr  = /instrument|analyt/i.test(category);
  const isTP2    = /team.?project.?2/i.test(course);

  let step2Approvers = [];
  if (isInstr)     { step2Approvers = staffCfg["VIEWERS"]        || []; }
  else if (isTP2)  { step2Approvers = staffCfg["STAFF_PROJECT_2"] || []; }
  else             { step2Approvers = staffCfg["STAFF_FLOOR_1"]   || []; }

  if (step2Approvers.length === 0) {
    finalizeApproval_(sheet, rowNo, stCol, caCol, booking, staffCfg);
    return renderResultPage_("อนุมัติสำเร็จ!", `การจอง "${booking.ItemName}" ได้รับการอนุมัติแล้ว`, "✅");
  }

  sheet.getRange(rowNo, stCol).setValue(STATUS.PENDING_STEP2);
  sheet.getRange(rowNo, caCol).setValue(step2Approvers.map(a => a.name).join(", "));
  sendApprovalEmail_(booking, step2Approvers);

  return renderResultPage_(
    "อนุมัติขั้นที่ 1 สำเร็จ",
    `ส่งต่อให้ ${step2Approvers.map(a => a.name).join(", ")} อนุมัติขั้นต่อไปแล้ว`,
    "✅"
  );
}

function approveStep2_(sheet, rowNo, stCol, caCol, booking, staffCfg) {
  finalizeApproval_(sheet, rowNo, stCol, caCol, booking, staffCfg);
  return renderResultPage_("อนุมัติสำเร็จ!", `การจอง "${booking.ItemName}" ได้รับการอนุมัติครบแล้ว`, "✅");
}

function finalizeApproval_(sheet, rowNo, stCol, caCol, booking, staffCfg) {
  sheet.getRange(rowNo, stCol).setValue(STATUS.APPROVED);
  sheet.getRange(rowNo, caCol).setValue("อนุมัติแล้ว");
  sendStudentNotifyEmail_(booking, "approved");
  const viewers = staffCfg["VIEWERS"] || [];
  if (viewers.length > 0) sendViewerNotifyEmail_(booking, viewers);
}

function setupDailyTrigger() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === "sendDailyReminderDigest") {
      ScriptApp.deleteTrigger(t);
    }
  });
  ScriptApp.newTrigger("sendDailyReminderDigest")
    .timeBased()
    .atHour(12)
    .nearMinute(0)
    .everyDays(1)
    .create();
}

function sendDailyReminderDigest() {
  const allBookings = sheetToObjects(SHEETS.BOOKINGS);
  const staffCfg   = getStaffConfig();
  const pending = allBookings.filter(b => b.Status === STATUS.PENDING_ADVISOR || b.Status === STATUS.PENDING_STEP2);
  if (pending.length === 0) return;
  const byApprover = {};
  pending.forEach(b => {
    if (b.Status === STATUS.PENDING_ADVISOR) {
      if (b.AdvisorEmail) {
        const key = b.AdvisorEmail.toLowerCase().trim();
        if (!byApprover[key]) byApprover[key] = [];
        byApprover[key].push(b);
      }
    } else if (b.Status === STATUS.PENDING_STEP2) {
      const cat = String(b.Category || "").toLowerCase();
      const course = String(b.Course || "").toLowerCase();
      let approvers = [];
      if (/instrument|analyt/.test(cat)) { approvers = staffCfg["VIEWERS"] || []; }
      else if (/team.?project.?2/.test(course)) { approvers = staffCfg["STAFF_PROJECT_2"] || []; }
      else { approvers = staffCfg["STAFF_FLOOR_1"] || []; }
      approvers.forEach(a => {
        const key = a.email.toLowerCase().trim();
        if (!byApprover[key]) byApprover[key] = [];
        byApprover[key].push(b);
      });
    }
  });
  Object.entries(byApprover).forEach(([email, bookings]) => {
    try { sendDigestEmail_(email, bookings); } catch (err) {}
  });
}

function sendDigestEmail_(toEmail, bookings) {
  const count = bookings.length;
  const rows = bookings.map(b => {
    const start = b.Start ? String(b.Start).replace("T", " ").substring(0, 16) : "-";
    const end = b.End ? String(b.End).replace("T", " ").substring(0, 16) : "-";
    const status = b.Status || "-";
    const statusColor = status === STATUS.PENDING_ADVISOR ? "#e65100" : "#1565C0";
    return `<tr><td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;font-weight:600;">${b.ItemName || "-"}</td><td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;">${b.Name || "-"}</td><td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;">${start}</td><td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;">${end}</td><td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;"><span style="background:${statusColor}1a;color:${statusColor};padding:3px 10px;border-radius:999px;font-size:12px;font-weight:700;">${status}</span></td></tr>`;
  }).join("");
  const html = `<html><body style="font-family:Arial,sans-serif;padding:20px;background:#f4f4f4;"><div style="background:#fff;padding:20px;border-radius:10px;max-width:600px;margin:0 auto;"><h2>[KCIB] รายการรออนุมัติ (${count})</h2><table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">${rows}</table><div style="margin-top:20px;text-align:center;"><a href="${KCIB_SITE_URL}" style="background:#ff6d38;color:#fff;padding:10px 20px;border-radius:5px;text-decoration:none;">ไปที่ระบบ KCIB</a></div></div></body></html>`;
  MailApp.sendEmail({ to: toEmail, name: "KCIB System", subject: `[KCIB] คุณมี ${count} รายการรออนุมัติ`, htmlBody: html });
}

function sendApprovalEmail_(booking, approvers) {
  if (!approvers || approvers.length === 0) return;
  const webUrl = ScriptApp.getService().getUrl();
  const bookingId = booking.bookingId || booking.BookingID || "";
  const approveUrl = `${webUrl}?action=process_email&type=approve&bookingId=${encodeURIComponent(bookingId)}`;
  const rejectUrl = `${webUrl}?action=process_email&type=reject&bookingId=${encodeURIComponent(bookingId)}`;
  const toEmails = approvers.map(a => a.email).join(",");
  const itemName = booking.itemName || booking.ItemName || "";
  const studentName = booking.name || booking.Name || "";
  const html = `<html><body style="font-family:Arial,sans-serif;padding:20px;"><div style="background:#f9f9f9;padding:20px;border-radius:10px;"><h3>มีการจองใหม่รออนุมัติ</h3><p>อุปกรณ์: <b>${itemName}</b></p><p>ผู้จอง: <b>${studentName}</b></p><div style="margin-top:20px;"><a href="${approveUrl}" style="background:#2e7d32;color:#fff;padding:10px 20px;border-radius:5px;text-decoration:none;margin-right:10px;">อนุมัติ</a><a href="${rejectUrl}" style="background:#c62828;color:#fff;padding:10px 20px;border-radius:5px;text-decoration:none;">ปฏิเสธ</a></div></div></body></html>`;
  MailApp.sendEmail({ to: toEmails, name: "KCIB System", subject: `[KCIB] รออนุมัติ: ${itemName} (${studentName})`, htmlBody: html });
}

function sendStudentNotifyEmail_(booking, type) {
  const email = String(booking.Email || "").trim();
  const itemName = String(booking.ItemName || "");
  if (!email) return;
  const isApproved = type === "approved";
  const html = `<html><body><h3>การจอง ${itemName} ${isApproved ? "ได้รับการอนุมัติแล้ว" : "ถูกปฏิเสธ"}</h3><p>กรุณาตรวจสอบในระบบ</p></body></html>`;
  MailApp.sendEmail({ to: email, name: "KCIB System", subject: `[KCIB] ผลการจอง: ${itemName}`, htmlBody: html });
}

function sendViewerNotifyEmail_(booking, viewers) {
  if (!viewers || viewers.length === 0) return;
  const toEmails = viewers.map(v => v.email).join(",");
  const itemName = String(booking.ItemName || "");
  const studentName = String(booking.Name || "");
  const html = `<html><body><h3>การจองอนุมัติแล้ว (รับทราบ)</h3><p>อุปกรณ์: ${itemName}</p><p>ผู้จอง: ${studentName}</p></body></html>`;
  MailApp.sendEmail({ to: toEmails, name: "KCIB System", subject: `[KCIB] แจ้งรับทราบ: ${itemName}`, htmlBody: html });
}

function renderResultPage_(title, subtitle, icon) {
  const color = icon === "✅" ? "#2e7d32" : "#c62828";
  const html = `<html><body style="font-family:Arial;text-align:center;padding:50px;"><h1>${icon}</h1><h2 style="color:${color}">${title}</h2><p>${subtitle}</p><br><a href="${KCIB_SITE_URL}">กลับสู่ระบบ</a></body></html>`;
  return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
