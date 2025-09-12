let currentBindings = {};
let defaultSettings = {};

window.addEventListener("DOMContentLoaded", async () => {
  setupTabs();

  document.getElementById("back-to-title")?.addEventListener("click", () => {
    window.location.href = "./index.html";
  });

  await loadKeyBindings();
  await loadDefaultSettings();
  applySettingsFromStorage();

  document.getElementById("save-btn")?.addEventListener("click", saveSettings);
});

function setupTabs() {
  document.querySelectorAll(".tab-button").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-button").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach((tc) => tc.classList.remove("active"));

      btn.classList.add("active");
      const tabId = btn.dataset.tab;
      document.getElementById("tab-" + tabId).classList.add("active");
    });
  });
}

async function loadKeyBindings() {
  const saved = localStorage.getItem("keyBindings");
  if (saved) {
    currentBindings = JSON.parse(saved);
  } else {
    try {
      const response = await fetch("../../../config/keys.json");
      currentBindings = await response.json();
      localStorage.setItem("keyBindings", JSON.stringify(currentBindings));
    } catch (e) {
      console.error("キー設定の読み込みに失敗しました:", e);
      currentBindings = {};
    }
  }

  for (const action in currentBindings) {
    const input = document.getElementById(`key-${action}`);
    if (!input) continue;

    input.value = codeToLabel(currentBindings[action]);
    input.addEventListener("keydown", (e) => {
      e.preventDefault();
      const code = e.code;
      currentBindings[action] = code;
      input.value = codeToLabel(code);
    });
    input.addEventListener("beforeinput", (e) => e.preventDefault());
  }
}

async function loadDefaultSettings() {
  try {
    const res = await fetch("../../../config/settings.json");
    defaultSettings = await res.json();
  } catch (e) {
    console.error("設定の読み込みに失敗しました:", e);
    defaultSettings = {};
  }
}

function applySettingsFromStorage() {
  setCheckbox("toggle-ghost", "show-ghost", defaultSettings["show-ghost"]);
  setCheckbox("toggle-hold", "enable-hold", defaultSettings["enable-hold"]);
  setCheckbox("toggle-time", "show-time", defaultSettings["show-time"]);
  setNumber("next-count", "next-count", defaultSettings["next-count"]);

  setCheckbox("toggle-harddrop", "enable-harddrop", defaultSettings["enable-harddrop"]);
  setCheckbox("reverse-rotation", "reverse-rotation", defaultSettings["reverse-rotation"]);
  setNumber("das", "das", defaultSettings["das"]);
  setNumber("arr", "arr", defaultSettings["arr"]);
  setNumber("lock-delay", "lock-delay", defaultSettings["lock-delay"]);
}

function codeToLabel(code) {
  const map = {
    ArrowLeft: "←",
    ArrowRight: "→",
    ArrowUp: "↑",
    ArrowDown: "↓",
    Space: "␣",
    Enter: "⏎",
    Escape: "Esc",
  };
  if (map[code]) return map[code];
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  return code;
}

function saveSettings() {
  const nextCount = getNumber("next-count", 1, 5);
  if (nextCount === null) return;

  localStorage.setItem("keyBindings", JSON.stringify(currentBindings));
  localStorage.setItem("next-count", nextCount);

  saveCheckbox("toggle-ghost", "show-ghost");
  saveCheckbox("toggle-hold", "enable-hold");
  saveCheckbox("toggle-time", "show-time");

  saveCheckbox("toggle-harddrop", "enable-harddrop");
  saveCheckbox("reverse-rotation", "reverse-rotation");
  saveNumber("das", "das");
  saveNumber("arr", "arr");
  saveNumber("lock-delay", "lock-delay");

  showMessage("設定を保存しました！設定は次回ゲーム起動時に反映されます。", "success");
}

function showMessage(text, type) {
  const box = document.getElementById("message-box");
  if (!box) return;
  box.textContent = text;
  box.style.display = "block";
  box.className = type === "error" ? "error" : "success";
  setTimeout(() => {
    box.style.display = "none";
  }, 3000);
}

// ✅ 初回のみ settings.json の default を localStorage に保存するよう修正済み
function setCheckbox(id, key, def = false) {
  const el = document.getElementById(id);
  if (!el) return;

  const stored = localStorage.getItem(key);
  if (stored === null) {
    el.checked = def;
    localStorage.setItem(key, def); // 初回に保存！
  } else {
    el.checked = stored === "true";
  }
}

function setNumber(id, key, def = 0) {
  const el = document.getElementById(id);
  const val = localStorage.getItem(key);
  if (el && val !== null) {
    el.value = val;
  } else if (el) {
    el.value = def;
    localStorage.setItem(key, def); // 初回に保存！
  }
}

function saveCheckbox(id, key) {
  const el = document.getElementById(id);
  if (el) localStorage.setItem(key, el.checked);
}

function saveNumber(id, key) {
  const el = document.getElementById(id);
  const val = parseInt(el?.value);
  if (!isNaN(val)) localStorage.setItem(key, val);
}

function getNumber(id, min = 0, max = Infinity) {
  const input = document.getElementById(id);
  const value = parseInt(input?.value);
  if (isNaN(value) || value < min || value > max) {
    showMessage(`${min}〜${max} の数値を指定してください。`, "error");
    return null;
  }
  return value;
}