window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("marathon-btn")?.addEventListener("click", () => {
    window.location.href = "./single/marathon.html";
  });

  document.getElementById("sprint-btn")?.addEventListener("click", () => {
    window.location.href = "./single/sprint.html";
  });

  /*
  document.getElementById("cpu-btn")?.addEventListener("click", () => {
    window.location.href = "./cpu.html"; // ※今後 cpu.html に分割予定ならここも変更(コメントアウト解除時にディレクトリ指定は要確認)
  });
  */

  document.getElementById("settings-btn")?.addEventListener("click", () => {
    window.location.href = "./settings.html";
  });

  document.getElementById("credits-btn")?.addEventListener("click", () => {
    window.location.href = "./credits.html";
  });
});