import { SprintGame } from "./sprint.js";

window.addEventListener("DOMContentLoaded", () => {
  const game = new SprintGame();
  game.start();

  // リザルト画面のボタンイベントを設定
  document.addEventListener("click", (e) => {
    if (e.target.id === "retry-button") {
      window.location.reload(); // Sprintのリトライ
    } else if (e.target.id === "title-button") {
      window.location.href = "../../html/index.html"; // タイトルに戻る
    }
  });
});