import { MarathonGame } from "./marathon.js";

// ★マラソン起動（このファイル1本だけを <script type="module"> で読み込むこと）
window.addEventListener("DOMContentLoaded", () => {
  if (window.__TETRIS_GAME_RUNNING__) {
    console.warn("[Marathon] already running, skip second boot:", window.__TETRIS_GAME_RUNNING__);
    return;
  }
  window.__TETRIS_GAME_RUNNING__ = "marathon";

  const game = new MarathonGame("game-canvas", 5, (hud) => {
    // 必要ならHUD更新
  });

  // デバッグしやすいように公開
  window.__game = game;

  game.start?.();

  // リザルトボタンのイベント登録
  document.addEventListener("click", (e) => {
    if (e.target.id === "retry-button") {
      window.location.reload();
    } else if (e.target.id === "title-button") {
      window.location.href = "../../html/index.html";
    }
  });
});