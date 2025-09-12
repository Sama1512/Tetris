import { SingleGameBase } from "./single_game.js";
import { updateUI } from "../ui/ui.js";

export class MarathonGame extends SingleGameBase {
  constructor() {
    super("game-canvas", 5, null);
    this.currentLevel = 1;
    this.dropInterval = null;
  }

  start(onStateUpdate) {
    this.onStateUpdate = onStateUpdate;
    super.start(); // reset()とspawnMino()を呼び出す
    this.updateDropSpeed(true);
    this.startDropLoop();
  }

  getDropInterval() {
    if (typeof this.currentLevel !== "number" || isNaN(this.currentLevel)) {
      console.warn("⚠️ currentLevel is invalid, resetting to 1");
      this.currentLevel = 1;
    }
    return Math.max(100, 500 - (this.currentLevel - 1) * 50);
  }

  startDropLoop() {
    clearInterval(this.dropInterval);
    const interval = this.getDropInterval();
    this.dropInterval = setInterval(() => this.moveMino(0, 1), interval);
    console.log(`🕒 Drop interval started: ${interval}ms (level ${this.currentLevel})`);
  }

  updateDropSpeed(force = false) {
    const scoreState = this.scoreManager.getState();
    if (!scoreState || typeof scoreState.level !== "number") {
      console.warn("Invalid scoreState.level:", scoreState?.level);
      return;
    }
    const newLevel = Number(scoreState.level);
    if (isNaN(newLevel)) {
      console.warn("newLevel is NaN! Raw value:", scoreState.level);
      return;
    }
    this.currentLevel = newLevel;
    this.startDropLoop();
  }

  onClear(cleared) {
    this.scoreManager.addLines(cleared);
    this.updateDropSpeed();
  }

  onGameOver() {
    clearInterval(this.dropInterval);
    this.endGame("GAME OVER", false);
  }

  onClearFinish() {
    clearInterval(this.dropInterval);
    this.endGame("CLEAR!", true);
  }

  endGame(message, isClear) {
    this.isGameOver = true; // 入力・描画停止フラグを立てる

    this.render(); // 最終描画
    // showGameOver(); // 背景表示(ui/ui.jsにあるが、現時点で二重に表示されてしまうため今後削除対象かも)

    const state = this.scoreManager?.getState() ?? {};
    const score = state.score ?? 0;
    const lines = state.lines ?? 0;

    const resultBox = document.getElementById("result-box");
    if (resultBox) {
      const color = isClear ? "#00ff00" : "#ff3333";
      resultBox.innerHTML = `
        <div class="result-message" style="color:${color};">${message}</div>
        <div class="result-lines">LINES: ${lines}</div>
        <div class="result-score">SCORE: ${score}</div>
        <div class="result-buttons">
          <button onclick="location.reload()">リトライ</button>
          <button onclick="location.href='../../html/index.html'">タイトルに戻る</button>
        </div>
      `;
      resultBox.style.display = "block";
    } else {
      alert(`${message}\nLINES: ${lines}\nSCORE: ${score}`);
    }
  }

  render() {
    super.render();
    const scoreState = this.scoreManager.getState();
    updateUI(scoreState);
  }
}