// Tetris/public/js/main.js
window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("marathon-btn")?.addEventListener("click", () => {
    window.location.href = "./single/marathon.html";
  });

  document.getElementById("sprint-btn")?.addEventListener("click", () => {
    window.location.href = "./single/sprint.html";
  });

  // === CPUレベル選択UIをホームに追加 ===
  const cpuBtn = document.getElementById("cpu-btn");
  if (cpuBtn) {
    const levels = [
      {v:1,n:"Lv1: 練習用"},
      {v:2,n:"Lv2: 初心者"},
      {v:3,n:"Lv3: 初級"},
      {v:4,n:"Lv4: 中級"},
      {v:5,n:"Lv5: 標準"},
      {v:6,n:"Lv6: 上級"},
      {v:7,n:"Lv7: エキスパート"},
      {v:8,n:"Lv8: マスター"},
      {v:9,n:"Lv9: 伝説"},
      {v:10,n:"Lv10: 神"},
    ];
    const saved = parseInt(localStorage.getItem("cpuLevel")||"5",10);
    const wrap = document.createElement("div");
    wrap.className = "cpu-level-wrap";
    wrap.style.marginTop = "6px";
    wrap.innerHTML = `
      <label for="cpu-level" style="margin-right:8px;">CPUレベル</label>
      <select id="cpu-level" style="padding:4px 8px;">
        ${levels.map(l => `<option value="${l.v}" ${l.v===saved?"selected":""}>${l.n}</option>`).join("")}
      </select>
    `;
    cpuBtn.insertAdjacentElement("afterend", wrap);
  }

  document.getElementById("cpu-btn")?.addEventListener("click", () => {
    const lv = parseInt(document.getElementById("cpu-level")?.value || localStorage.getItem("cpuLevel") || "5", 10);
    const level = Math.min(10, Math.max(1, isNaN(lv)?5:lv));
    localStorage.setItem("cpuLevel", String(level));
    window.location.href = "./versus/cpu.html?level=" + level;
  });

  document.getElementById("settings-btn")?.addEventListener("click", () => {
    window.location.href = "./settings.html";
  });

  document.getElementById("credits-btn")?.addEventListener("click", () => {
    window.location.href = "./credits.html";
  });
});