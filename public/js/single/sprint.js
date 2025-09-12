import { SingleGameBase } from "./single_game.js";
import { updateUI } from "../ui/ui.js";

export class SprintGame extends SingleGameBase {
  constructor(targetLines = 40) {
    super("game-canvas", 5, null);
    this.targetLines = targetLines;
    this.startTime = 0;
    this.elapsed = 0;
    this.timerId = null;
    this.dropInterval = null;
  }

  start(onStateUpdate) {
    this.onStateUpdate = onStateUpdate;
    super.start();
    this.scoreManager.reset?.();
    this.startTime = performance.now();
    this.updateTime();
    this.dropInterval = setInterval(() => this.moveMino(0, 1), 500);
  }

  updateTime() {
    this.elapsed = performance.now() - this.startTime;
    updateUI(this.scoreManager.getState(), this.elapsed);
    this.timerId = requestAnimationFrame(() => this.updateTime());
  }

  onClear(cleared) {
    this.scoreManager.addLines(cleared);
    if (this.scoreManager.getState().lines >= this.targetLines) {
      this.endGame("CLEAR!", true);
    }
  }

  onGameOver() {
    this.endGame("GAME OVER", false);
  }

  endGame(message, isClear) {
    this.isGameOver = true; // 入力と描画停止のフラグ

    clearInterval(this.dropInterval);
    cancelAnimationFrame(this.timerId);
    this.render();

    const time = this.formatTime(this.elapsed);
    const lines = this.scoreManager.getState()?.lines ?? 0;
    const resultBox = document.getElementById("result-box");

    if (resultBox) {
      const color = isClear ? "#00ff00" : "#ff3333";
      resultBox.innerHTML = `
        <div class="result-message" style="color:${color};">${message}</div>
        <div class="result-lines">LINES: ${lines}</div>
        <div class="result-time">TIME: ${time}</div>
        <div class="result-buttons">
          <button onclick="location.reload()">リトライ</button>
          <button onclick="location.href='../../html/index.html'">タイトルに戻る</button>
        </div>
      `;
      resultBox.style.display = "block";
    } else {
      alert(`${message}\nLINES: ${lines}\nTIME: ${time}`);
    }
  }

  formatTime(ms) {
    const sec = ms / 1000;
    const minutes = Math.floor(sec / 60);
    const seconds = (sec % 60).toFixed(2);
    return `${minutes}:${seconds.padStart(5, "0")}`;
  }
}