// ============================================================
// KCIB Backend — Google Apps Script v2.0
// Spreadsheet: 18nu0jZcDyyEJGfylpazITc5lK2gdb0u5rrmESQnPVZ4
// Deploy: Extensions > Apps Script > Deploy > New deployment
//   Execute as: Me | Who has access: Anyone
// ============================================================

const SHEET_ID    = "18nu0jZcDyyEJGfylpazITc5lK2gdb0u5rrmESQnPVZ4";
const KCIB_SITE_URL = "https://kcib.netlify.app"; // ← แก้เป็น URL จริงหลัง deploy

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

  // Email approval link handler
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
      default:              return jsonOut({ error: "Invalid action: " + data.action });
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

  const staffCfg  = getStaffConfig();
  const advisors  = staffCfg["ADVISORS"] || [];

  // Resolve chosen advisor
  const chosenAdvisor = advisors.find(a => a.email === data.advisorEmail) || {};
  const advisorEmail  = chosenAdvisor.email || data.advisorEmail || "";
  const advisorName   = chosenAdvisor.name  || advisorEmail;

  const bookingId = "BK" + Date.now();

  const newRow = [
    new Date(),                    // Timestamp
    bookingId,                     // BookingID
    data.email        || "",       // Email
    data.name         || "",       // Name
    data.category     || "",       // Category
    data.itemName     || "",       // ItemName
    data.itemId       || "",       // ItemID
    data.course       || "",       // Course
    data.quantity     || "",       // Quantity
    data.start        || "",       // Start
    data.end          || "",       // End
    data.note         || "",       // Note
    advisorEmail,                  // AdvisorEmail
    STATUS.PENDING_ADVISOR,        // Status
    advisorName                    // CurrentApproverName
  ];

  sheet.appendRow(newRow);

  // Send approval email to the chosen advisor only
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

// ===================== DAILY REMINDER DIGEST =====================

/**
 * วิธีใช้: เปิด Apps Script editor → เรียก setupDailyTrigger() ครั้งเดียว
 * หมายเหตุ: ต้องตั้ง Timezone ของ Apps Script เป็น Asia/Bangkok ก่อน
 *   (Project Settings → Script Properties → Time Zone → Asia/Bangkok)
 */
function setupDailyTrigger() {
  // ลบ trigger เดิมก่อน
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === "sendDailyReminderDigest") {
      ScriptApp.deleteTrigger(t);
    }
  });
  // สร้าง trigger ใหม่ 12:00 น. ทุกวัน (Asia/Bangkok)
  ScriptApp.newTrigger("sendDailyReminderDigest")
    .timeBased()
    .atHour(12)
    .nearMinute(0)
    .everyDays(1)
    .create();
  Logger.log("✅ Daily reminder trigger created: 12:00 Asia/Bangkok every day");
}

function sendDailyReminderDigest() {
  const allBookings = sheetToObjects(SHEETS.BOOKINGS);
  const staffCfg   = getStaffConfig();

  // กรองเฉพาะรายการที่รออนุมัติ
  const pending = allBookings.filter(b =>
    b.Status === STATUS.PENDING_ADVISOR || b.Status === STATUS.PENDING_STEP2
  );

  if (pending.length === 0) {
    Logger.log("Daily digest: no pending bookings.");
    return;
  }

  // จัดกลุ่มตาม approver email
  const byApprover = {};

  function addToApprover(email, booking) {
    if (!email) return;
    const key = email.toLowerCase().trim();
    if (!byApprover[key]) byApprover[key] = [];
    byApprover[key].push(booking);
  }

  pending.forEach(b => {
    if (b.Status === STATUS.PENDING_ADVISOR) {
      // ส่งให้อาจารย์ที่ปรึกษาที่ระบุในการจอง
      addToApprover(b.AdvisorEmail, b);
    } else if (b.Status === STATUS.PENDING_STEP2) {
      // ส่งให้ step 2 approvers ตาม category/course
      const cat    = String(b.Category || "").toLowerCase();
      const course = String(b.Course   || "").toLowerCase();
      let approvers = [];
      if (/instrument|analyt/.test(cat))       { approvers = staffCfg["VIEWERS"]         || []; }
      else if (/team.?project.?2/.test(course)) { approvers = staffCfg["STAFF_PROJECT_2"] || []; }
      else                                       { approvers = staffCfg["STAFF_FLOOR_1"]   || []; }
      approvers.forEach(a => addToApprover(a.email, b));
    }
  });

  // ส่งอีเมลให้แต่ละ approver
  let sent = 0;
  Object.entries(byApprover).forEach(([email, bookings]) => {
    try {
      sendDigestEmail_(email, bookings);
      sent++;
    } catch (err) {
      Logger.log("sendDailyReminderDigest error for " + email + ": " + err.message);
    }
  });
  Logger.log("Daily digest sent to " + sent + " approvers (" + pending.length + " pending bookings).");
}

function sendDigestEmail_(toEmail, bookings) {
  const count = bookings.length;

  const rows = bookings.map(b => {
    const start    = b.Start    ? String(b.Start).replace("T", " ").substring(0, 16) : "-";
    const end      = b.End      ? String(b.End).replace("T", " ").substring(0, 16) : "-";
    const status   = b.Status  || "-";
    const statusColor = status === STATUS.PENDING_ADVISOR ? "#e65100" : "#1565C0";
    return `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;font-weight:600;">${b.ItemName || "-"}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;">${b.Name || "-"}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;">${start}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;">${end}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;">
          <span style="background:${statusColor}1a;color:${statusColor};padding:3px 10px;border-radius:999px;font-size:12px;font-weight:700;">${status}</span>
        </td>
      </tr>`;
  }).join("");

  const html = `
<!DOCTYPE html>
<html lang="th">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:24px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08);max-width:600px;width:100%;">
  <!-- Header -->
  <tr>
    <td style="background:linear-gradient(135deg,#1e2a3a 0%,#2d3f55 100%);padding:28px 32px;text-align:center;">
      <div style="font-size:22px;font-weight:800;color:#ff6d38;letter-spacing:-0.5px;">KCIB</div>
      <div style="color:#ffffff;font-size:13px;margin-top:4px;opacity:0.8;">KMITL ChE Inventory &amp; Booking</div>
      <div style="margin-top:16px;background:rgba(255,109,56,0.15);border:1px solid rgba(255,109,56,0.4);border-radius:10px;padding:10px 20px;display:inline-block;">
        <span style="color:#ff6d38;font-size:15px;font-weight:700;">⏰ แจ้งเตือนรายการรออนุมัติ</span>
      </div>
    </td>
  </tr>
  <!-- Body -->
  <tr>
    <td style="padding:28px 32px;">
      <p style="margin:0 0 8px;font-size:15px;color:#374151;">คุณมีรายการจองที่รออนุมัติ <strong style="color:#ff6d38;">${count} รายการ</strong></p>
      <p style="margin:0 0 24px;font-size:13px;color:#6b7280;">กรุณาตรวจสอบรายละเอียดด้านล่างและดำเนินการผ่านลิงก์ที่ได้รับทางอีเมลก่อนหน้า</p>

      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;font-size:14px;">
        <thead>
          <tr style="background:#f8f9fa;">
            <th style="padding:10px 12px;text-align:left;font-weight:700;color:#374151;border-bottom:2px solid #e5e7eb;">อุปกรณ์</th>
            <th style="padding:10px 12px;text-align:left;font-weight:700;color:#374151;border-bottom:2px solid #e5e7eb;">ผู้จอง</th>
            <th style="padding:10px 12px;text-align:left;font-weight:700;color:#374151;border-bottom:2px solid #e5e7eb;">เริ่ม</th>
            <th style="padding:10px 12px;text-align:left;font-weight:700;color:#374151;border-bottom:2px solid #e5e7eb;">สิ้นสุด</th>
            <th style="padding:10px 12px;text-align:left;font-weight:700;color:#374151;border-bottom:2px solid #e5e7eb;">สถานะ</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <div style="text-align:center;margin:28px 0 8px;">
        <a href="${KCIB_SITE_URL}" style="background:#ff6d38;color:#ffffff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;">
          เปิดระบบ KCIB →
        </a>
      </div>
    </td>
  </tr>
  <!-- Footer -->
  <tr>
    <td style="background:#f8f9fa;padding:16px 32px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="margin:0;font-size:12px;color:#9ca3af;">อีเมลนี้ส่งโดยอัตโนมัติจากระบบ KCIB — กรุณาอย่าตอบกลับ</p>
      <p style="margin:4px 0 0;font-size:12px;color:#9ca3af;">ภาควิชาวิศวกรรมเคมี คณะวิศวกรรมศาสตร์ สจล.</p>
    </td>
  </tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  MailApp.sendEmail({
    to:       toEmail,
    name:     "KCIB System (ไม่ต้องตอบกลับ)",
    replyTo:  "noreply@kmitl.ac.th",
    subject:  `[KCIB] คุณมี ${count} รายการรออนุมัติ — ${Utilities.formatDate(new Date(), "Asia/Bangkok", "dd/MM/yyyy")}`,
    htmlBody: html
  });
}

// ===================== EMAIL HELPERS =====================
function sendApprovalEmail_(booking, approvers) {
  if (!approvers || approvers.length === 0) return;

  const webUrl     = ScriptApp.getService().getUrl();
  const bookingId  = booking.bookingId || booking.BookingID || "";
  const approveUrl = `${webUrl}?action=process_email&type=approve&bookingId=${encodeURIComponent(bookingId)}`;
  const rejectUrl  = `${webUrl}?action=process_email&type=reject&bookingId=${encodeURIComponent(bookingId)}`;

  const itemName     = booking.itemName     || booking.ItemName   || "";
  const studentName  = booking.name         || booking.Name       || "";
  const studentEmail = booking.email        || booking.Email      || "";
  const category     = booking.category     || booking.Category   || "";
  const course       = booking.course       || booking.Course     || "ทั่วไป";
  const start        = booking.start        || booking.Start      || "-";
  const end          = booking.end          || booking.End        || "-";
  const qty          = booking.quantity     || booking.Quantity   || "";
  const note         = booking.note         || booking.Note       || "-";

  const toEmails = approvers.map(a => a.email).join(",");
  const toNames  = approvers.map(a => a.name).join(", ");

  const qtyRow  = qty ? `<tr><td style="padding:8px 12px;background:#f8f9fa;font-weight:600;width:36%;">จำนวน</td><td style="padding:8px 12px;">${qty}</td></tr>` : "";
  const timeRow = start !== "-"
    ? `<tr><td style="padding:8px 12px;background:#f8f9fa;font-weight:600;">วันเวลา</td><td style="padding:8px 12px;">${start}${end !== "-" ? " — " + end : ""}</td></tr>`
    : "";

  const html = `
<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:24px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08);max-width:600px;width:100%;">
  <tr>
    <td style="background:linear-gradient(135deg,#1e2a3a,#2d3f55);padding:28px 32px;">
      <div style="font-size:20px;font-weight:800;color:#ff6d38;">KCIB</div>
      <div style="color:#fff;font-size:18px;font-weight:700;margin-top:8px;">มีการจองใหม่รออนุมัติ</div>
      <div style="color:rgba(255,255,255,.7);font-size:13px;margin-top:4px;">กรุณาตรวจสอบและดำเนินการ</div>
    </td>
  </tr>
  <tr>
    <td style="padding:28px 32px;">
      <p style="margin:0 0 16px;font-size:15px;">เรียน <strong>${toNames}</strong>,</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;font-size:14px;">
        <tr><td style="padding:8px 12px;background:#f8f9fa;font-weight:600;width:36%;">อุปกรณ์</td><td style="padding:8px 12px;font-weight:700;color:#1e2a3a;">${itemName}</td></tr>
        <tr><td style="padding:8px 12px;background:#f8f9fa;font-weight:600;">หมวดหมู่</td><td style="padding:8px 12px;">${category}</td></tr>
        <tr><td style="padding:8px 12px;background:#f8f9fa;font-weight:600;">ผู้จอง</td><td style="padding:8px 12px;">${studentName} &lt;${studentEmail}&gt;</td></tr>
        <tr><td style="padding:8px 12px;background:#f8f9fa;font-weight:600;">วิชา/โครงการ</td><td style="padding:8px 12px;">${course}</td></tr>
        ${timeRow}${qtyRow}
        <tr><td style="padding:8px 12px;background:#f8f9fa;font-weight:600;">หมายเหตุ</td><td style="padding:8px 12px;">${note}</td></tr>
      </table>
      <div style="text-align:center;margin:24px 0 0;">
        <a href="${approveUrl}" style="background:#2e7d32;color:#fff;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:700;margin-right:12px;display:inline-block;">✅ อนุมัติ</a>
        <a href="${rejectUrl}"  style="background:#c62828;color:#fff;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">❌ ปฏิเสธ</a>
      </div>
    </td>
  </tr>
  <tr>
    <td style="background:#f8f9fa;padding:14px 32px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="margin:0;font-size:12px;color:#9ca3af;">ระบบ KCIB — KMITL ChE Inventory &amp; Booking | <a href="${KCIB_SITE_URL}" style="color:#ff6d38;">เปิดเว็บไซต์</a></p>
    </td>
  </tr>
</table>
</td></tr></table>
</body></html>`;

  try {
    MailApp.sendEmail({
      to: toEmails, replyTo: studentEmail,
      name: "KCIB System",
      subject: `[KCIB] รออนุมัติ: ${itemName} (${studentName})`,
      htmlBody: html
    });
  } catch (err) { Logger.log("sendApprovalEmail error: " + err.message); }
}

function sendStudentNotifyEmail_(booking, type) {
  const email    = String(booking.Email    || "").trim();
  const itemName = String(booking.ItemName || "");
  if (!email) return;

  const isApproved = type === "approved";
  const color      = isApproved ? "#2e7d32" : "#c62828";
  const statusText = isApproved ? "✅ อนุมัติแล้ว" : "❌ ถูกปฏิเสธ";
  const msg        = isApproved
    ? "การจองของคุณได้รับการอนุมัติครบแล้ว กรุณาติดต่อเจ้าหน้าที่ตามขั้นตอนต่อไป"
    : "การจองของคุณถูกปฏิเสธ กรุณาติดต่ออาจารย์ที่ปรึกษาสำหรับข้อมูลเพิ่มเติม";

  const html = `
<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:24px 0;">
<tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08);max-width:520px;width:100%;">
  <tr><td style="background:${color};padding:24px 32px;text-align:center;">
    <div style="font-size:20px;font-weight:800;color:#fff;">KCIB</div>
    <div style="color:#fff;font-size:16px;font-weight:700;margin-top:8px;">ผลการพิจารณาการจอง</div>
  </td></tr>
  <tr><td style="padding:28px 32px;text-align:center;">
    <div style="font-size:48px;margin-bottom:12px;">${isApproved ? "✅" : "❌"}</div>
    <div style="font-size:18px;font-weight:700;color:${color};margin-bottom:8px;">${statusText}</div>
    <div style="font-size:15px;color:#374151;margin-bottom:6px;">อุปกรณ์: <strong>${itemName}</strong></div>
    <div style="font-size:14px;color:#6b7280;margin-top:12px;">${msg}</div>
    <a href="${KCIB_SITE_URL}" style="display:inline-block;margin-top:20px;background:#ff6d38;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;">ดูการจองของฉัน</a>
  </td></tr>
  <tr><td style="background:#f8f9fa;padding:14px 32px;text-align:center;border-top:1px solid #e5e7eb;">
    <p style="margin:0;font-size:12px;color:#9ca3af;">ระบบ KCIB — KMITL ChE Inventory &amp; Booking</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;

  try {
    MailApp.sendEmail({
      to: email, name: "KCIB System",
      subject: `[KCIB] ${isApproved ? "อนุมัติแล้ว" : "ปฏิเสธ"}: ${itemName}`,
      htmlBody: html
    });
  } catch (err) { Logger.log("sendStudentNotify error: " + err.message); }
}

function sendViewerNotifyEmail_(booking, viewers) {
  if (!viewers || viewers.length === 0) return;
  const toEmails    = viewers.map(v => v.email).join(",");
  const itemName    = String(booking.ItemName || "");
  const studentName = String(booking.Name     || "");
  const category    = String(booking.Category || "");
  const course      = String(booking.Course   || "-");
  const start       = String(booking.Start    || "-");
  const end         = String(booking.End      || "-");

  const html = `
<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:24px 0;">
<tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08);max-width:520px;width:100%;">
  <tr><td style="background:linear-gradient(135deg,#1e2a3a,#2d3f55);padding:24px 32px;">
    <div style="font-size:20px;font-weight:800;color:#ff6d38;">KCIB</div>
    <div style="color:#fff;font-size:15px;font-weight:700;margin-top:6px;">การจองอนุมัติแล้ว (แจ้งรับทราบ)</div>
  </td></tr>
  <tr><td style="padding:24px 32px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;font-size:14px;">
      <tr><td style="padding:8px 12px;background:#f8f9fa;font-weight:600;width:38%;">อุปกรณ์</td><td style="padding:8px 12px;font-weight:700;">${itemName}</td></tr>
      <tr><td style="padding:8px 12px;background:#f8f9fa;font-weight:600;">หมวดหมู่</td><td style="padding:8px 12px;">${category}</td></tr>
      <tr><td style="padding:8px 12px;background:#f8f9fa;font-weight:600;">ผู้จอง</td><td style="padding:8px 12px;">${studentName}</td></tr>
      <tr><td style="padding:8px 12px;background:#f8f9fa;font-weight:600;">วิชา/โครงการ</td><td style="padding:8px 12px;">${course}</td></tr>
      <tr><td style="padding:8px 12px;background:#f8f9fa;font-weight:600;">ช่วงเวลา</td><td style="padding:8px 12px;">${start}${end !== "-" ? " — " + end : ""}</td></tr>
    </table>
  </td></tr>
  <tr><td style="background:#f8f9fa;padding:14px 32px;text-align:center;border-top:1px solid #e5e7eb;">
    <p style="margin:0;font-size:12px;color:#9ca3af;">ระบบ KCIB — KMITL ChE Inventory &amp; Booking | <a href="${KCIB_SITE_URL}" style="color:#ff6d38;">เปิดเว็บไซต์</a></p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;

  try {
    MailApp.sendEmail({
      to: toEmails, name: "KCIB System",
      subject: `[KCIB] อนุมัติแล้ว (รับทราบ): ${itemName} (${studentName})`,
      htmlBody: html
    });
  } catch (err) { Logger.log("sendViewerNotify error: " + err.message); }
}

// ===================== RESULT PAGE =====================
function renderResultPage_(title, subtitle, icon) {
  const isSuccess = icon === "✅";
  const color = isSuccess ? "#2e7d32" : (icon === "⚠️" ? "#e65100" : "#c62828");
  const html = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    *{box-sizing:border-box;margin:0;padding:0;font-family:'Sarabun',Arial,sans-serif;}
    body{background:#f4f4f4;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px;}
    .card{background:#fff;border-radius:20px;padding:48px 40px;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,.1);max-width:480px;width:100%;}
    .icon{font-size:64px;margin-bottom:20px;}
    h1{color:${color};margin:0 0 12px;font-size:1.6rem;font-weight:700;}
    p{color:#6b7280;font-size:15px;line-height:1.6;}
    .btn{display:inline-block;margin-top:24px;padding:12px 28px;background:#ff6d38;color:#fff;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;}
    .footer{margin-top:28px;font-size:12px;color:#9ca3af;}
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${icon}</div>
    <h1>${title}</h1>
    <p>${subtitle}</p>
    <a href="${KCIB_SITE_URL}" class="btn">กลับสู่ระบบ KCIB</a>
    <div class="footer">⚗️ KCIB — KMITL ChE Inventory &amp; Booking</div>
  </div>
</body>
</html>`;
  return HtmlService.createHtmlOutput(html)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
