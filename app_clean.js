const STORAGE_KEY = "aviya-insurance-tracker-v2";

let audioContext = null;

const elements = {
  currentDate: document.getElementById("currentDate"),
  // Tabs
  tabSaleBtn: document.getElementById("tabSaleBtn"),
  tabReportsBtn: document.getElementById("tabReportsBtn"),
  saleTabContent: document.getElementById("saleTabContent"),
  reportsTabContent: document.getElementById("reportsTabContent"),

  // Sale form inputs
  customerNameInput: document.getElementById("customerNameInput"),
  saleTypeSelect: document.getElementById("saleTypeSelect"),
  saleAmountInput: document.getElementById("saleAmountInput"),
  calculatedAmountPreview: document.getElementById("calculatedAmountPreview"),
  addSaleBtn: document.getElementById("addSaleBtn"),

  // Quick summary
  quickAgentCount: document.getElementById("quickAgentCount"),
  quickAgentSum: document.getElementById("quickAgentSum"),
  quickSurveyCount: document.getElementById("quickSurveyCount"),
  quickSurveySum: document.getElementById("quickSurveySum"),
  quickTotalSum: document.getElementById("quickTotalSum"),
  lockDayBtn: document.getElementById("lockDayBtn"),

  // Reports
  reportMonthPicker: document.getElementById("reportMonthPicker"),
  reportMonthlyAgentSum: document.getElementById("reportMonthlyAgentSum"),
  reportMonthlySurveySum: document.getElementById("reportMonthlySurveySum"),
  reportMonthlyTotalSum: document.getElementById("reportMonthlyTotalSum"),
  reportsTableBody: document.getElementById("reportsTableBody"),

  // Effects
  characterOverlay: document.getElementById("characterOverlay"),
  characterImg: document.getElementById("characterImg"),
  moneyRain: document.getElementById("moneyRain")
};

const CHARACTERS = {
  BART: "bart.png",
  HOMER: "homer.png"
};

const now = new Date();
const todayKey = getDateKey(now);
let state = loadState();
ensureDay(todayKey);

// Set default month in report picker
if (elements.reportMonthPicker) {
  elements.reportMonthPicker.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

bindEvents();
refreshUI();
setInterval(() => {
  const nowDate = new Date();
  elements.currentDate.textContent = `תאריך: ${nowDate.toLocaleDateString("he-IL")}`;
}, 1000);
initAudioContext();

function bindEvents() {
  // Tabs switching
  elements.tabSaleBtn.addEventListener("click", () => {
    elements.tabSaleBtn.classList.add("active");
    elements.tabReportsBtn.classList.remove("active");
    elements.saleTabContent.classList.add("active");
    elements.reportsTabContent.classList.remove("active");
  });

  elements.tabReportsBtn.addEventListener("click", () => {
    elements.tabReportsBtn.classList.add("active");
    elements.tabSaleBtn.classList.remove("active");
    elements.reportsTabContent.classList.add("active");
    elements.saleTabContent.classList.remove("active");
    renderReports();
  });

  // Calculate live preview
  elements.saleAmountInput.addEventListener("input", updatePreview);
  elements.saleTypeSelect.addEventListener("change", updatePreview);

  // Submit sale
  elements.addSaleBtn.addEventListener("click", () => {
    const day = getTodayRecord();
    if (day.locked) {
      alert("היום נשמר וננעל, לא ניתן להוסיף מכירות.");
      return;
    }

    const customerName = elements.customerNameInput.value.trim();
    if (!customerName) {
      alert("נא להזין שם לקוח.");
      return;
    }

    const amount = parseFloat(elements.saleAmountInput.value);
    if (isNaN(amount) || amount <= 0) {
      alert("נא להזין סכום מכירה תקין.");
      return;
    }

    const type = elements.saleTypeSelect.value; // 'agent' or 'survey'
    const calculatedAmount = type === "agent" ? amount * 0.3 : amount;

    const newSale = {
      id: Date.now(),
      time: new Date().toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" }),
      customerName,
      type,
      originalAmount: amount,
      calculatedAmount
    };

    day.sales.push(newSale);
    saveState();

    // Reset inputs
    elements.customerNameInput.value = "";
    elements.saleAmountInput.value = "";
    updatePreview();

    // Effects & feedback
    if (type === "agent") {
      playSound("money");
      showCharacterOverlay("BART");
    } else {
      playSound("money");
      showCharacterOverlay("HOMER");
    }
    showMoneyRain();
    launchConfetti();

    refreshUI();
  });

  // Lock day button
  elements.lockDayBtn.addEventListener("click", () => {
    const day = getTodayRecord();
    if (day.locked) {
      alert("היום כבר נשמר וננעל.");
      return;
    }

    if (!confirm("לאשר שמירת יום? לאחר שמירה לא ניתן יהיה להוסיף מכירות ליום זה.")) {
      return;
    }

    day.locked = true;
    saveState();
    refreshUI();
    alert("היום נשמר וננעל בהצלחה.");
  });

  // Report month change
  elements.reportMonthPicker.addEventListener("change", () => {
    renderReports();
  });
}

function updatePreview() {
  const amount = parseFloat(elements.saleAmountInput.value);
  if (isNaN(amount) || amount <= 0) {
    elements.calculatedAmountPreview.innerHTML = `סה"כ מחושב מועבר לזיכוי: <strong>0 ₪</strong>`;
    return;
  }
  const type = elements.saleTypeSelect.value;
  const calc = type === "agent" ? amount * 0.3 : amount;
  const rateText = type === "agent" ? "30%" : "100%";
  elements.calculatedAmountPreview.innerHTML = `סה"כ מחושב מועבר לזיכוי (${rateText}): <strong>${calc.toLocaleString("he-IL")} ₪</strong>`;
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
      sales: [],
      locked: false
    };
    saveState();
  } else {
    const day = state.days[dateKey];
    if (!Array.isArray(day.sales)) {
      day.sales = [];
    }
    if (typeof day.locked !== "boolean") {
      day.locked = false;
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
  
  const agentSales = day.sales.filter(s => s.type === "agent");
  const surveySales = day.sales.filter(s => s.type === "survey");

  const agentCalcSum = agentSales.reduce((sum, s) => sum + s.calculatedAmount, 0);
  const surveyCalcSum = surveySales.reduce((sum, s) => sum + s.calculatedAmount, 0);
  const totalCalcSum = agentCalcSum + surveyCalcSum;

  elements.quickAgentCount.textContent = String(agentSales.length);
  elements.quickAgentSum.textContent = `${agentCalcSum.toLocaleString("he-IL")} ₪`;

  elements.quickSurveyCount.textContent = String(surveySales.length);
  elements.quickSurveySum.textContent = `${surveyCalcSum.toLocaleString("he-IL")} ₪`;

  elements.quickTotalSum.textContent = `${totalCalcSum.toLocaleString("he-IL")} ₪`;

  const isLocked = !!day.locked;
  elements.addSaleBtn.disabled = isLocked;
  elements.customerNameInput.disabled = isLocked;
  elements.saleAmountInput.disabled = isLocked;
  elements.saleTypeSelect.disabled = isLocked;

  if (isLocked) {
    elements.lockDayBtn.textContent = "היום נשמר וננעל 🔒";
    elements.lockDayBtn.disabled = true;
  } else {
    elements.lockDayBtn.textContent = "נעילת יום 🔒";
    elements.lockDayBtn.disabled = false;
  }
}

function renderReports() {
  const monthVal = elements.reportMonthPicker.value;
  if (!monthVal || !monthVal.includes("-")) {
    elements.reportsTableBody.innerHTML = `<tr><td colspan="6">אנא בחר חודש תקין</td></tr>`;
    return;
  }

  const [yearStr, monthStr] = monthVal.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);

  let monthlyAgentSum = 0;
  let monthlySurveySum = 0;
  let allSalesInMonth = [];

  Object.entries(state.days).forEach(([dateKey, dayData]) => {
    const [y, m] = dateKey.split("-").map(Number);
    if (y === year && m === month && dayData.sales) {
      dayData.sales.forEach(sale => {
        allSalesInMonth.push({
          dateKey,
          ...sale
        });
        if (sale.type === "agent") {
          monthlyAgentSum += sale.calculatedAmount;
        } else {
          monthlySurveySum += sale.calculatedAmount;
        }
      });
    }
  });

  allSalesInMonth.sort((a, b) => b.id - a.id);

  elements.reportMonthlyAgentSum.textContent = `${monthlyAgentSum.toLocaleString("he-IL")} ₪`;
  elements.reportMonthlySurveySum.textContent = `${monthlySurveySum.toLocaleString("he-IL")} ₪`;
  elements.reportMonthlyTotalSum.textContent = `${(monthlyAgentSum + monthlySurveySum).toLocaleString("he-IL")} ₪`;

  if (allSalesInMonth.length === 0) {
    elements.reportsTableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px;">אין מכירות בחודש זה</td></tr>`;
    return;
  }

  elements.reportsTableBody.innerHTML = allSalesInMonth.map(sale => {
    const typeLabel = sale.type === "agent" ? "מינוי סוכן (30%)" : "סוקר (100%)";
    const typeBadgeClass = sale.type === "agent" ? "badge-agent" : "badge-survey";
    return `
      <tr>
        <td>${sale.dateKey} ${sale.time || ""}</td>
        <td><strong>${escapeHtml(sale.customerName)}</strong></td>
        <td><span class="type-badge ${typeBadgeClass}">${typeLabel}</span></td>
        <td>${sale.originalAmount.toLocaleString("he-IL")} ₪</td>
        <td><strong>${sale.calculatedAmount.toLocaleString("he-IL")} ₪</strong></td>
        <td>
          <button class="btn-delete-sale" onclick="deleteSale('${sale.dateKey}', ${sale.id})">🗑️ מחק</button>
        </td>
      </tr>
    `;
  }).join("");
}

window.deleteSale = function(dateKey, saleId) {
  const day = state.days[dateKey];
  if (!day) return;

  if (day.locked) {
    alert("היום של מכירה זו נעול, לא ניתן למחוק מכירה מיום נעול.");
    return;
  }

  if (!confirm("האם למחוק מכירה זו?")) {
    return;
  }

  day.sales = day.sales.filter(s => s.id !== saleId);
  saveState();
  refreshUI();
  renderReports();
};

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, function(m) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[m];
  });
}

function launchConfetti() {
  if (typeof confetti !== "function") return;
  confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
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

function showCharacterOverlay(type) {
  elements.characterImg.src = CHARACTERS[type];
  elements.characterOverlay.classList.add("show");
  setTimeout(() => {
    elements.characterOverlay.classList.remove("show");
  }, 1500);
}

function showMoneyRain() {
  elements.moneyRain.innerHTML = "";
  elements.moneyRain.classList.add("show");
  
  const count = 40;
  for (let i = 0; i < count; i++) {
    const dollar = document.createElement("div");
    dollar.className = "dollar";
    dollar.textContent = "💵";
    dollar.style.left = Math.random() * 100 + "vw";
    dollar.style.animationDuration = (Math.random() * 1 + 0.5) + "s";
    dollar.style.animationDelay = (Math.random() * 0.5) + "s";
    elements.moneyRain.appendChild(dollar);
  }

  setTimeout(() => {
    elements.moneyRain.classList.remove("show");
    elements.moneyRain.innerHTML = "";
  }, 1500);
}

function playSound(soundType) {
  if (!audioContext) return;
  try {
    playMoneySound();
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
  osc.frequency.exponentialRampToValueAtTime(1200, now + 0.2);

  osc.start(now);
  osc.stop(now + 0.2);
}