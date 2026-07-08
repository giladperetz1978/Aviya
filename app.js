const STORAGE_KEY = "aviya-insurance-tracker-v1";
const MAX_SHIFT_HOURS_DISPLAY = 12;

let audioContext = null;
let soundLibrary = {};

const elements = {
  currentDate: document.getElementById("currentDate"),
  agentAppointmentBtn: document.getElementById("agentAppointmentBtn"),
  surveyBtn: document.getElementById("surveyBtn"),
  saleAmountInput: document.getElementById("saleAmountInput"),
  addSaleBtn: document.getElementById("addSaleBtn"),
  agentAppointmentCount: document.getElementById("agentAppointmentCount"),
  surveyCount: document.getElementById("surveyCount"),
  totalSalesAmount: document.getElementById("totalSalesAmount"),
  salesList: document.getElementById("salesList"),
  toggleEditBtn: document.getElementById("toggleEditBtn"),
  editForm: document.getElementById("editForm"),
  editAgentAppointment: document.getElementById("editAgentAppointment"),
  editSurvey: document.getElementById("editSurvey"),
  applyEditBtn: document.getElementById("applyEditBtn"),
  lockDayBtn: document.getElementById("lockDayBtn"),
  openSummaryBtn: document.getElementById("openSummaryBtn"),
  summaryDialog: document.getElementById("summaryDialog"),
  monthPicker: document.getElementById("monthPicker"),
  summaryTableBody: document.getElementById("summaryTableBody"),
  summaryTableFoot: document.getElementById("summaryTableFoot"),
  soundEffect: document.getElementById("soundEffect")
};

const now = new Date();
const todayKey = getDateKey(now);
let state = loadState();
ensureDay(todayKey);

elements.monthPicker.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

bindEvents();
refreshUI();
setInterval(refreshUI, 1000);
initAudioContext();

function bindEvents() {
  elements.agentAppointmentBtn.addEventListener("click", () => {
    const day = getTodayRecord();
    if (day.locked) {
      alert("היום נשמר וננעל, לא ניתן לשנות נתונים.");
      return;
    }
    day.agentAppointment += 1;
    saveState();
    playSound("money");
    launchConfetti();
    refreshUI();
  });

  elements.surveyBtn.addEventListener("click", () => {
    const day = getTodayRecord();
    if (day.locked) {
      alert("היום נשמר וננעל, לא ניתן לשנות נתונים.");
      return;
    }
    day.survey += 1;
    saveState();
    playSound("money");
    launchConfetti();
    refreshUI();
  });

  elements.addSaleBtn.addEventListener("click", () => {
    const day = getTodayRecord();
    if (day.locked) {
      alert("היום נשמר וננעל, לא ניתן לשנות נתונים.");
      return;
    }
    const amount = parseFloat(elements.saleAmountInput.value);
    if (isNaN(amount) || amount <= 0) {
      alert("נא להזין סכום תקין.");
      return;
    }
    day.salesAmounts.push(amount);
    elements.saleAmountInput.value = "";
    saveState();
    playSound("money");
    launchConfetti();
    refreshUI();
  });

  elements.toggleEditBtn.addEventListener("click", () => {
    const day = getTodayRecord();
    if (day.locked) {
      alert("היום נשמר וננעל, לא ניתן לערוך.");
      return;
    }

    const isHidden = elements.editForm.classList.contains("hidden");
    if (isHidden) {
      elements.editAgentAppointment.value = day.agentAppointment;
      elements.editSurvey.value = day.survey;
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

    const agentAppointment = Number(elements.editAgentAppointment.value);
    const survey = Number(elements.editSurvey.value);

    if (!Number.isInteger(agentAppointment) || agentAppointment < 0 || !Number.isInteger(survey) || survey < 0) {
      alert("הכמויות חייבות להיות מספרים שלמים ולא שליליים.");
      return;
    }

    day.agentAppointment = agentAppointment;
    day.survey = survey;

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
      agentAppointment: 0,
      survey: 0,
      salesAmounts: [],
      locked: false,
      lockedAt: null
    };
    saveState();
  } else {
    const day = state.days[dateKey];
    if (typeof day.locked !== "boolean") {
      day.locked = false;
    }
    if (!Number.isFinite(day.agentAppointment)) {
      day.agentAppointment = 0;
    }
    if (!Number.isFinite(day.survey)) {
      day.survey = 0;
    }
    if (!Array.isArray(day.salesAmounts)) {
      day.salesAmounts = [];
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
  
  elements.agentAppointmentCount.textContent = String(day.agentAppointment);
  elements.surveyCount.textContent = String(day.survey);
  
  const totalAmount = day.salesAmounts.reduce((acc, val) => acc + val, 0);
  elements.totalSalesAmount.textContent = `${totalAmount.toLocaleString("he-IL")} ₪`;

  elements.salesList.innerHTML = day.salesAmounts.map(val => `<span class="sale-pill">${val} ₪</span>`).join("");

  const isLocked = !!day.locked;

  elements.agentAppointmentBtn.disabled = isLocked;
  elements.surveyBtn.disabled = isLocked;
  elements.addSaleBtn.disabled = isLocked;
  elements.saleAmountInput.disabled = isLocked;

  if (isLocked) {
    elements.editForm.classList.add("hidden");
    elements.toggleEditBtn.textContent = "תיקון / עריכת נתוני היום";
    elements.lockDayBtn.textContent = "היום נשמר וננעל";
    elements.lockDayBtn.disabled = true;
  } else {
    elements.lockDayBtn.textContent = "נעילה";
    elements.lockDayBtn.disabled = false;
  }
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

function renderSummaryTable(monthValue) {
  const monthlyColumnCount = 4;

  if (!monthValue || !monthValue.includes("-")) {
    elements.summaryTableBody.innerHTML = `<tr><td colspan="${monthlyColumnCount}">בחרי חודש להצגה</td></tr>`;
    elements.summaryTableFoot.innerHTML = "";
    return;
  }

  const [yearStr, monthStr] = monthValue.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);

  const rows = Object.entries(state.days)
    .filter(([date]) => {
      const [y, m] = date.split("-").map(Number);
      return y === year && m === month;
    })
    .sort((a, b) => a[0].localeCompare(b[0]));

  if (rows.length === 0) {
    elements.summaryTableBody.innerHTML = `<tr><td colspan="${monthlyColumnCount}">אין נתונים לחודש זה</td></tr>`;
    elements.summaryTableFoot.innerHTML = "";
    return;
  }

  let sumAgent = 0;
  let sumSurvey = 0;
  let sumAmount = 0;

  elements.summaryTableBody.innerHTML = rows
    .map(([date, day]) => {
      const dayAmount = day.salesAmounts.reduce((acc, val) => acc + val, 0);
      sumAgent += day.agentAppointment;
      sumSurvey += day.survey;
      sumAmount += dayAmount;

      return `
        <tr>
          <td>${date}</td>
          <td>${day.agentAppointment}</td>
          <td>${day.survey}</td>
          <td>${dayAmount.toLocaleString("he-IL")} ₪</td>
        </tr>
      `;
    })
    .join("");

  elements.summaryTableFoot.innerHTML = `
    <tr>
      <td>סה"כ חודש</td>
      <td>${sumAgent}</td>
      <td>${sumSurvey}</td>
      <td>${sumAmount.toLocaleString("he-IL")} ₪</td>
    </tr>
  `;
}

function initAudioContext() {
  if (audioContext) return;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioContextClass();
  } catch (e) {
    console.warn("Web Audio API not supported", e);
  }
}

function playSound(soundType) {
  if (!audioContext) return;

  try {
    if (soundType === "money") {
      playMoneySound();
    } else if (soundType === "celebration") {
      playCelebrationSound();
    } else if (soundType === "disappointment") {
      playDisappointmentSound();
    }
  } catch (e) {
    console.warn("Error playing sound", e);
  }
}

function playMoneySound() {
  const ctx = audioContext;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  gain.gain.setValueAtTime(0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

  osc.frequency.setValueAtTime(800, now);
  osc.frequency.exponentialRampToValueAtTime(600, now + 0.05);
  osc.frequency.exponentialRampToValueAtTime(400, now + 0.15);

  osc.start(now);
  osc.stop(now + 0.2);
}

function playCelebrationSound() {
  const ctx = audioContext;
  const now = ctx.currentTime;

  for (let i = 0; i < 2; i++) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const startTime = now + i * 0.15;
    const freq = i === 0 ? 600 : 800;

    gain.gain.setValueAtTime(0.25, startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.12);

    osc.frequency.setValueAtTime(freq, startTime);
    osc.start(startTime);
    osc.stop(startTime + 0.12);
  }
}

function playDisappointmentSound() {
  const ctx = audioContext;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  gain.gain.setValueAtTime(0.25, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

  osc.frequency.setValueAtTime(500, now);
  osc.frequency.exponentialRampToValueAtTime(300, now + 0.4);

  osc.start(now);
  osc.stop(now + 0.4);
}

function showMoneyAnimation() {
  if (!elements.moneyAnimationOverlay) return;

  elements.moneyAnimationOverlay.classList.add("show");
  setTimeout(() => {
    elements.moneyAnimationOverlay.classList.remove("show");
  }, 800);
}
