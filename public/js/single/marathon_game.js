import { MarathonGame } from "./marathon.js";

window.addEventListener("DOMContentLoaded", () => {
  const game = new MarathonGame();
  game.start();

  // リザルトボタンのイベント登録
  document.addEventListener("click", (e) => {
    if (e.target.id === "retry-button") {
      window.location.reload(); // 現在のページ（marathon.html）をリロード
    } else if (e.target.id === "title-button") {
      window.location.href = "../../html/index.html"; // タイトルに戻る
    }
  });
});