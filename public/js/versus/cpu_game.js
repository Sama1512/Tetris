import { PrefixedSingleGame } from "./duo_game.js";
import { initInput } from "../core/input.js";
import { VersusManager } from "./versus_manager.js";
import { NewCPU } from "./ai_new.js";
import { getNextBag } from "../core/mino.js";
import { sound } from "../ui/sound.js";
import { checkCollision } from "../core/field.js";

window.addEventListener("DOMContentLoaded", () => {
  // 二重起動ガード
  if (window.__TETRIS_GAME_RUNNING__) return;
  window.__TETRIS_GAME_RUNNING__ = "cpu";

  // ====== めり込みガード：ガベージ適用直後に上方向へ退避 ======
  function afterGarbageFix(game) {
    const m = game.currentMino; if (!m) return;
    // 既にめり込んでないなら何もしない
    if (!checkCollision(game.field, m)) return;

    // 上方向へ最大盤面高さぶんキック（20段想定）
    const saved = { x: m.x, y: m.y, r: m.rotation, type: m.type, blocks: m.blocks };
    let kicked = false;
    for (let up = 1; up <= 22; up++) {
      const cand = { ...m, y: m.y - up };
      if (!checkCollision(game.field, cand)) {
        m.y = cand.y; // 退避成功
        kicked = true;
        // 環境変化なのでロック猶予があればリセット
        try { game.resetLockDelay?.(); } catch {}
        break;
      }
    }
    if (!kicked) {
      // どこにも置けない＝トップアウト相当
      // 元の onGameOver を呼び出す
      try { game.onGameOver?.(); } catch {}
      // 念のため内部状態も止める
      game.isGameOver = true;
    }
  }

  // ====== DOM ======
  const resultBox = document.getElementById("result-box");
  const resultMsg = resultBox?.querySelector(".result-message");
  const retryBtn  = document.getElementById("retry-button");
  const titleBtn  = document.getElementById("title-button");

  // ====== 共有Bag ======
  const makeSharedQueue = () => {
    const q = [];
    for (let i = 0; i < 300; i++) q.push(...getNextBag());
    return q;
  };

  // ====== ゲームインスタンス ======
  const player = new PrefixedSingleGame("player-canvas", "player-");
  const cpu    = new PrefixedSingleGame("cpu-canvas",    "cpu-");

  // 初期化＆スポーン
  let ended = false;
  let shared = makeSharedQueue();
  const boot = (g) => {
    g.start();
    g.reset();
    g.nextQueue = shared.map(p => ({ ...p }));
    g.spawnMino();
  };
  boot(player);
  boot(cpu);

  // BGMは初クリックで解禁
  const startBGM = () => { try { sound.playBGM("Korobeiniki8bit"); } catch {} };
  window.addEventListener("pointerdown", startBGM, { once: true });

  // 入力（試合中のみ）
  initInput((action) => { if (!ended && !player.isGameOver) player.handleKey(action); });

  // CPU 起動
  const cpuAI = new NewCPU(cpu, { tickMs: 80 });
  cpuAI.start();

  // 対戦ルール
  const vm = new VersusManager(player, cpu, {});

  // 結果UI
  const showResult = (text) => {
    if (resultMsg) resultMsg.textContent = text || "RESULT";
    if (resultBox) resultBox.style.display = "block";
  };
  const hideResult = () => { if (resultBox) resultBox.style.display = "none"; };

  // 停止共通
  const stopAll = () => {
    if (ended) return;
    ended = true;
    try { cpuAI.stop(); } catch {}
    try { if (player._dropId) { clearInterval(player._dropId); player._dropId = null; } } catch {}
    try { if (cpu._dropId)    { clearInterval(cpu._dropId);    cpu._dropId    = null; } } catch {}
    player.isGameOver = true; cpu.isGameOver = true;
  };

  // 勝敗フック
  const origP = player.onGameOver, origC = cpu.onGameOver;
  player.onGameOver = () => { origP?.(); stopAll(); showResult("CPU WIN"); };
  cpu.onGameOver    = () => { origC?.(); stopAll(); showResult("PLAYER WIN"); };

  // ====== ガベージ適用タイマ（適用→めり込みガード） ======
  const garbageTimer = setInterval(() => {
    if (ended) return;
    vm.applyPending("player");
    afterGarbageFix(player);  // ★ここで退避
    vm.applyPending("cpu");
    afterGarbageFix(cpu);     // ★ここで退避
  }, 120);

  // リトライ/タイトル
  retryBtn?.addEventListener("click", () => {
    hideResult();
    ended = false;
    shared = makeSharedQueue();
    boot(player); boot(cpu);
    cpuAI.start();
  });
  titleBtn?.addEventListener("click", () => {
    try { cpuAI.stop(); } catch {}
    clearInterval(garbageTimer);
    window.location.href = "../../html/index.html";
  });

  // ページ離脱時も止める
  window.addEventListener("pagehide", () => { try { cpuAI.stop(); } catch {} clearInterval(garbageTimer); });
  window.addEventListener("beforeunload", () => { try { cpuAI.stop(); } catch {} clearInterval(garbageTimer); });

  // デバッグ
  window.__duo = { player, cpu, cpuAI, vm };
});