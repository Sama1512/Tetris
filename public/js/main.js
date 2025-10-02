window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("marathon-btn")?.addEventListener("click", () => {
    window.location.href = "./single/marathon.html";
  });

  document.getElementById("sprint-btn")?.addEventListener("click", () => {
    window.location.href = "./single/sprint.html";
  });

  document.getElementById("cpu-btn")?.addEventListener("click", () => {
    window.location.href = "./versus/cpu.html";
  });

  document.getElementById("settings-btn")?.addEventListener("click", () => {
    window.location.href = "./settings.html";
  });

  document.getElementById("credits-btn")?.addEventListener("click", () => {
    window.location.href = "./credits.html";
  });
});