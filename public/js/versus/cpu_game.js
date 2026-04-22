// Tetris/public/js/versus/cpu_game.js
import { PrefixedSingleGame } from "./duo_game.js";
import { initInput } from "../core/input.js";
import { VersusManager } from "./versus_manager.js";
import { getNextBag } from "../core/mino.js";
import { sound } from "../ui/sound.js";
import { checkCollision } from "../core/field.js";
import { ApiCPU } from "./ai_client.js";

window.addEventListener("DOMContentLoaded", () => {
  // 二重起動ガード
  if (window.__TETRIS_GAME_RUNNING__) return;
  window.__TETRIS_GAME_RUNNING__ = "cpu";

  // ===== DOM =====
  const resultBox = document.getElementById("result-box");
  const resultMsg = resultBox?.querySelector(".result-message");
  const retryBtn = document.getElementById("retry-button");
  const titleBtn = document.getElementById("title-button");

  // ===== レベルまわり =====
  const LEVEL_NAMES = [
    "練習用",
    "初心者",
    "初級",
    "中級",
    "標準",
    "上級",
    "エキスパート",
    "マスター",
    "伝説",
    "神",
  ];

  const getCpuLevel = () => {
    const sp = new URLSearchParams(location.search);
    const q = sp.get("level");
    const saved = localStorage.getItem("cpuLevel");
    let lv = parseInt(q ?? saved ?? "5", 10);
    if (!Number.isFinite(lv) || lv < 1 || lv > 10) lv = 5;
    localStorage.setItem("cpuLevel", String(lv));
    return lv;
  };

  const cpuLevel = getCpuLevel();
  const cpuLevelName = LEVEL_NAMES[cpuLevel - 1] || `Lv${cpuLevel}`;

  // ===== 共有Bag =====
  const makeSharedQueue = () => {
    const q = [];
    for (let i = 0; i < 300; i++) q.push(...getNextBag());
    return q;
  };

  // ===== ゲームインスタンス =====
  const player = new PrefixedSingleGame("player-canvas", "player-");
  const cpu = new PrefixedSingleGame("cpu-canvas", "cpu-");

  let ended = false;
  let shared = makeSharedQueue();

  const boot = (g) => {
    g.start();
    g.reset();
    g.nextQueue = shared.map((p) => ({ ...p }));
    g.spawnMino();
  };
  boot(player);
  boot(cpu);

  // BGM：初クリックで解禁
  const startBGM = () => {
    try {
      sound.playBGM("Korobeiniki8bit");
    } catch {}
  };
  window.addEventListener("pointerdown", startBGM, { once: true });

  // プレイヤー入力
  initInput((action) => {
    if (!ended && !player.isGameOver) player.handleKey(action);
  });

  // ===== CPU：C++/Go API 固定 =====
  let cpuAI = new ApiCPU(cpu, { level: cpuLevel, debug: true });
  console.log(
    `[CPU] Go/C++エンジン固定 (Lv${cpuLevel}: ${cpuLevelName})`
  );

  // ★ デバッグ: lockAndScore をパッチして field 更新を確認
  const origLock = cpu.lockAndScore.bind(cpu);
  cpu.lockAndScore = function() {
    origLock();
    const filled = cpu.field.flat().filter(c => c != null).length;
    console.log(`[CPU] locked! field cells filled: ${filled}`);
  };

  try {
    cpuAI.start();
  } catch {}

  // VS管理
  const vm = new VersusManager(player, cpu, {});

  // ===== 結果UI =====
  const showResult = (text) => {
    if (resultMsg) resultMsg.textContent = text || "RESULT";
    if (resultBox) resultBox.style.display = "block";
  };
  const hideResult = () => {
    if (resultBox) resultBox.style.display = "none";
  };

  const stopAll = () => {
    if (ended) return;
    ended = true;
    try {
      cpuAI?.stop?.();
    } catch {}
    try {
      if (player._dropId) {
        clearInterval(player._dropId);
        player._dropId = null;
      }
    } catch {}
    try {
      if (cpu._dropId) {
        clearInterval(cpu._dropId);
        cpu._dropId = null;
      }
    } catch {}
    player.isGameOver = true;
    cpu.isGameOver = true;
  };

  // 勝敗フック
  const origP = player.onGameOver;
  const origC = cpu.onGameOver;
  player.onGameOver = () => {
    origP?.();
    stopAll();
    showResult("CPU WIN");
  };
  cpu.onGameOver = () => {
    origC?.();
    stopAll();
    showResult("PLAYER WIN");
  };

  // ===== ガベージ適用タイマ =====
  const garbageTimer = setInterval(() => {
    if (ended) return;
    vm.applyPending("player");
    afterGarbageFix(player);
    vm.applyPending("cpu");
    afterGarbageFix(cpu);
  }, 120);

  // リトライ
  retryBtn?.addEventListener("click", () => {
    hideResult();
    ended = false;
    shared = makeSharedQueue();
    boot(player);
    boot(cpu);
    try {
      cpuAI?.stop?.();
    } catch {}
    cpuAI = new ApiCPU(cpu, { level: cpuLevel });
    console.log(
      `[CPU] Go/C++エンジン固定(リトライ) (Lv${cpuLevel}: ${cpuLevelName})`
    );
    try {
      cpuAI.start();
    } catch {}
  });

  // タイトルへ
  titleBtn?.addEventListener("click", () => {
    try {
      cpuAI?.stop?.();
    } catch {}
    window.location.href = "../../html/index.html";
  });

  // ページ離脱時も停止
  window.addEventListener("pagehide", () => {
    try {
      cpuAI?.stop?.();
    } catch {}
  });
  window.addEventListener("beforeunload", () => {
    try {
      cpuAI?.stop?.();
    } catch {}
  });

  // デバッグ用
  window.__duo = { player, cpu, cpuAI, vm };
});