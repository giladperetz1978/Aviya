const STORAGE_KEY = "aviya-shift-tracker-v1";

const elements = {
  currentDate: document.getElementById("currentDate"),
  successBtn: document.getElementById("successBtn"),
  failBtn: document.getElementById("failBtn"),
  shiftStartBtn: document.getElementById("shiftStartBtn"),
  shiftEndBtn: document.getElementById("shiftEndBtn"),
  crazyStartBtn: document.getElementById("crazyStartBtn"),
  crazyEndBtn: document.getElementById("crazyEndBtn"),
  totalCount: document.getElementById("totalCount"),
  successCount: document.getElementById("successCount"),
  failCount: document.getElementById("failCount"),
  successRate: document.getElementById("successRate"),
  workHours: document.getElementById("workHours"),
  crazyHours: document.getElementById("crazyHours"),
  toggleEditBtn: document.getElementById("toggleEditBtn"),
  editForm: document.getElementById("editForm"),
  editSuccess: document.getElementById("editSuccess"),
  editFail: document.getElementById("editFail"),
  editWork: document.getElementById("editWork"),
  editCrazy: document.getElementById("editCrazy"),
  applyEditBtn: document.getElementById("applyEditBtn"),
  lockDayBtn: document.getElementById("lockDayBtn"),
  cryOverlay: document.getElementById("cryOverlay"),
  openSummaryBtn: document.getElementById("openSummaryBtn"),
  summaryDialog: document.getElementById("summaryDialog"),
  monthPicker: document.getElementById("monthPicker"),
  summaryTableBody: document.getElementById("summaryTableBody"),
  summaryTableFoot: document.getElementById("summaryTableFoot")
};

const now = new Date();
const todayKey = getDateKey(now);
let state = loadState();
ensureDay(todayKey);

elements.monthPicker.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

bindEvents();
refreshUI();
setInterval(refreshUI, 1000);

function bindEvents() {
  elements.successBtn.addEventListener("click", () => {
    const day = getTodayRecord();
    if (day.locked) {
      alert("היום נשמר וננעל, לא ניתן לשנות נתונים.");
      return;
    }
    day.success += 1;
    saveState();
    launchConfetti();
    refreshUI();
  });

  elements.failBtn.addEventListener("click", () => {
    const day = getTodayRecord();
    if (day.locked) {
      alert("היום נשמר וננעל, לא ניתן לשנות נתונים.");
      return;
    }
    day.fail += 1;
    saveState();
    showCryOverlay();
    refreshUI();
  });

  elements.shiftStartBtn.addEventListener("click", () => {
    const day = getTodayRecord();
    if (day.locked) {
      alert("היום נשמר וננעל, לא ניתן לשנות נתונים.");
      return;
    }
    if (day.shiftStartTs) {
      alert("משמרת כבר התחילה.");
      return;
    }
    day.shiftStartTs = Date.now();
    saveState();
    refreshUI();
  });

  elements.shiftEndBtn.addEventListener("click", () => {
    if (getTodayRecord().locked) {
      alert("היום נשמר וננעל, לא ניתן לשנות נתונים.");
      return;
    }
    if (!confirm("לסיים יום עבודה?")) {
      return;
    }
    endShiftForToday();
  });

  elements.crazyStartBtn.addEventListener("click", () => {
    const day = getTodayRecord();
    if (day.locked) {
      alert("היום נשמר וננעל, לא ניתן לשנות נתונים.");
      return;
    }
    if (!day.shiftStartTs) {
      const startShift = confirm("אין משמרת פעילה. להתחיל משמרת עכשיו?");
      if (!startShift) {
        return;
      }
      day.shiftStartTs = Date.now();
    }

    if (day.crazyStartTs) {
      alert("'בעל הבית השתגע' כבר פעיל.");
      return;
    }

    day.crazyStartTs = Date.now();
    saveState();
    refreshUI();
  });

  elements.crazyEndBtn.addEventListener("click", () => {
    if (getTodayRecord().locked) {
      alert("היום נשמר וננעל, לא ניתן לשנות נתונים.");
      return;
    }
    if (!confirm("לסיים 'בעל הבית השתגע' וגם לסיים את יום העבודה?")) {
      return;
    }
    endCrazyAndCloseDay();
  });

  elements.toggleEditBtn.addEventListener("click", () => {
    const day = getTodayRecord();
    if (day.locked) {
      alert("היום נשמר וננעל, לא ניתן לערוך.");
      return;
    }

    const isHidden = elements.editForm.classList.contains("hidden");
    if (isHidden) {
      loadEditFormFromDay(day);
      elements.editForm.classList.remove("hidden");
      elements.toggleEditBtn.textContent = "סגירת עריכה";
    } else {
      elements.editForm.classList.add("hidden");
      elements.toggleEditBtn.textContent = "תיקון / עריכת נתוני היום";
    }
  });

  elements.editForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const day = getTodayRecord();
    if (day.locked) {
      alert("היום נשמר וננעל, לא ניתן לערוך.");
      return;
    }

    const success = Number(elements.editSuccess.value);
    const fail = Number(elements.editFail.value);
    const workMs = parseDurationText(elements.editWork.value);
    const crazyMs = parseDurationText(elements.editCrazy.value);

    if (!Number.isInteger(success) || success < 0 || !Number.isInteger(fail) || fail < 0) {
      alert("כמויות שימורים חייבות להיות מספרים שלמים ולא שליליים.");
      return;
    }

    if (workMs === null || crazyMs === null) {
      alert("פורמט שעות חייב להיות HH:MM:SS (למשל 08:30:00).");
      return;
    }

    day.success = success;
    day.fail = fail;
    day.shiftDurationMs = workMs;
    day.crazyDurationMs = crazyMs;
    day.shiftStartTs = null;
    day.crazyStartTs = null;

    saveState();
    refreshUI();
    alert("הנתונים עודכנו בהצלחה.");
  });

  elements.lockDayBtn.addEventListener("click", () => {
    const day = getTodayRecord();
    if (day.locked) {
      alert("היום כבר נשמר וננעל.");
      return;
    }

    if (!confirm("לאשר שמירת יום? לאחר שמירה לא ניתן יהיה לשנות את הנתונים.")) {
      return;
    }

    const nowTs = Date.now();
    if (day.shiftStartTs) {
      day.shiftDurationMs += nowTs - day.shiftStartTs;
      day.shiftStartTs = null;
    }
    if (day.crazyStartTs) {
      day.crazyDurationMs += nowTs - day.crazyStartTs;
      day.crazyStartTs = null;
    }

    day.locked = true;
    day.lockedAt = nowTs;
    saveState();
    refreshUI();
    alert("היום נשמר וננעל בהצלחה.");
  });

  elements.openSummaryBtn.addEventListener("click", () => {
    renderSummaryTable(elements.monthPicker.value);
    elements.summaryDialog.showModal();
  });

  elements.monthPicker.addEventListener("change", (event) => {
    renderSummaryTable(event.target.value);
  });
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { days: {} };
    }
    const parsed = JSON.parse(raw);
    return parsed?.days ? parsed : { days: {} };
  } catch {
    return { days: {} };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function ensureDay(dateKey) {
  if (!state.days[dateKey]) {
    state.days[dateKey] = {
      success: 0,
      fail: 0,
      shiftDurationMs: 0,
      crazyDurationMs: 0,
      shiftStartTs: null,
      crazyStartTs: null,
      locked: false,
      lockedAt: null
    };
    saveState();
  } else {
    const day = state.days[dateKey];
    if (typeof day.locked !== "boolean") {
      day.locked = false;
    }
    if (!("lockedAt" in day)) {
      day.lockedAt = null;
    }
  }
}

function getTodayRecord() {
  const key = getDateKey(new Date());
  ensureDay(key);
  return state.days[key];
}

function getDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function refreshUI() {
  const nowDate = new Date();
  elements.currentDate.textContent = `תאריך: ${nowDate.toLocaleDateString("he-IL")}`;

  const day = getTodayRecord();
  const total = day.success + day.fail;
  const successRate = total > 0 ? (day.success / total) * 100 : 0;

  elements.totalCount.textContent = String(total);
  elements.successCount.textContent = String(day.success);
  elements.failCount.textContent = String(day.fail);
  elements.successRate.textContent = `${successRate.toFixed(1)}%`;

  const extraShiftMs = day.shiftStartTs ? Date.now() - day.shiftStartTs : 0;
  const extraCrazyMs = day.crazyStartTs ? Date.now() - day.crazyStartTs : 0;

  elements.workHours.textContent = formatDuration(day.shiftDurationMs + extraShiftMs);
  elements.crazyHours.textContent = formatDuration(day.crazyDurationMs + extraCrazyMs);

  const isLocked = !!day.locked;
  elements.successBtn.disabled = isLocked;
  elements.failBtn.disabled = isLocked;
  elements.shiftStartBtn.disabled = isLocked;
  elements.shiftEndBtn.disabled = isLocked;
  elements.crazyStartBtn.disabled = isLocked;
  elements.crazyEndBtn.disabled = isLocked;
  elements.toggleEditBtn.disabled = isLocked;
  elements.applyEditBtn.disabled = isLocked;

  if (isLocked) {
    elements.editForm.classList.add("hidden");
    elements.toggleEditBtn.textContent = "תיקון / עריכת נתוני היום";
    elements.lockDayBtn.textContent = "היום נשמר וננעל";
    elements.lockDayBtn.disabled = true;
  } else {
    elements.lockDayBtn.textContent = "שמירת היום (נעילה)";
    elements.lockDayBtn.disabled = false;
  }
}

function endShiftForToday() {
  const day = getTodayRecord();
  if (!day.shiftStartTs) {
    alert("אין משמרת פעילה כרגע.");
    return;
  }

  const nowTs = Date.now();
  day.shiftDurationMs += nowTs - day.shiftStartTs;
  day.shiftStartTs = null;

  if (day.crazyStartTs) {
    day.crazyDurationMs += nowTs - day.crazyStartTs;
    day.crazyStartTs = null;
  }

  saveState();
  refreshUI();
}

function endCrazyAndCloseDay() {
  const day = getTodayRecord();
  if (!day.crazyStartTs && !day.shiftStartTs) {
    alert("אין זמן פעיל לסיום.");
    return;
  }

  const nowTs = Date.now();

  if (day.crazyStartTs) {
    day.crazyDurationMs += nowTs - day.crazyStartTs;
    day.crazyStartTs = null;
  }

  if (day.shiftStartTs) {
    day.shiftDurationMs += nowTs - day.shiftStartTs;
    day.shiftStartTs = null;
  }

  saveState();
  refreshUI();
}

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function parseDurationText(text) {
  const normalized = String(text || "").trim();
  const match = normalized.match(/^(\d+):(\d{2}):(\d{2})$/);
  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);

  if (minutes > 59 || seconds > 59) {
    return null;
  }

  return ((hours * 60 + minutes) * 60 + seconds) * 1000;
}

function loadEditFormFromDay(day) {
  const extraShiftMs = day.shiftStartTs ? Date.now() - day.shiftStartTs : 0;
  const extraCrazyMs = day.crazyStartTs ? Date.now() - day.crazyStartTs : 0;

  elements.editSuccess.value = String(day.success);
  elements.editFail.value = String(day.fail);
  elements.editWork.value = formatDuration(day.shiftDurationMs + extraShiftMs);
  elements.editCrazy.value = formatDuration(day.crazyDurationMs + extraCrazyMs);
}

function launchConfetti() {
  if (typeof confetti !== "function") {
    return;
  }

  confetti({
    particleCount: 120,
    spread: 80,
    origin: { y: 0.6 }
  });
}

function showCryOverlay() {
  elements.cryOverlay.classList.add("show");
  setTimeout(() => {
    elements.cryOverlay.classList.remove("show");
  }, 2000);
}

function renderSummaryTable(monthValue) {
  if (!monthValue || !monthValue.includes("-")) {
    elements.summaryTableBody.innerHTML = `<tr><td colspan="7">בחרי חודש להצגה</td></tr>`;
    elements.summaryTableFoot.innerHTML = "";
    return;
  }

  const [yearStr, monthStr] = monthValue.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);

  if (Number.isNaN(year) || Number.isNaN(month)) {
    elements.summaryTableBody.innerHTML = `<tr><td colspan="7">בחירת חודש לא תקינה</td></tr>`;
    elements.summaryTableFoot.innerHTML = "";
    return;
  }

  const rows = Object.entries(state.days)
    .filter(([date]) => {
      const [y, m] = date.split("-").map(Number);
      return y === year && m === month;
    })
    .sort((a, b) => a[0].localeCompare(b[0]));

  if (rows.length === 0) {
    elements.summaryTableBody.innerHTML = `<tr><td colspan="7">אין נתונים לחודש זה</td></tr>`;
    elements.summaryTableFoot.innerHTML = "";
    return;
  }

  let sumTotal = 0;
  let sumSuccess = 0;
  let sumFail = 0;
  let sumWorkMs = 0;
  let sumCrazyMs = 0;

  elements.summaryTableBody.innerHTML = rows
    .map(([date, day]) => {
      const total = day.success + day.fail;
      const rate = total > 0 ? ((day.success / total) * 100).toFixed(1) : "0.0";

      const openShiftMs = day.shiftStartTs ? Date.now() - day.shiftStartTs : 0;
      const openCrazyMs = day.crazyStartTs ? Date.now() - day.crazyStartTs : 0;

      const dayWorkMs = day.shiftDurationMs + openShiftMs;
      const dayCrazyMs = day.crazyDurationMs + openCrazyMs;

      sumTotal += total;
      sumSuccess += day.success;
      sumFail += day.fail;
      sumWorkMs += dayWorkMs;
      sumCrazyMs += dayCrazyMs;

      return `
        <tr>
          <td>${date}</td>
          <td>${total}</td>
          <td>${day.success}</td>
          <td>${day.fail}</td>
          <td>${rate}%</td>
          <td>${formatDuration(dayWorkMs)}</td>
          <td>${formatDuration(dayCrazyMs)}</td>
        </tr>
      `;
    })
    .join("");

  const monthRate = sumTotal > 0 ? ((sumSuccess / sumTotal) * 100).toFixed(1) : "0.0";

  elements.summaryTableFoot.innerHTML = `
    <tr>
      <td>סה"כ חודש</td>
      <td>${sumTotal}</td>
      <td>${sumSuccess}</td>
      <td>${sumFail}</td>
      <td>${monthRate}%</td>
      <td>${formatDuration(sumWorkMs)}</td>
      <td>${formatDuration(sumCrazyMs)}</td>
    </tr>
  `;
}
