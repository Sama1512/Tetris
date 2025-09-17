import { SingleGameBase } from "./single_game.js";
import { updateUI } from "../ui/ui.js";

export class SprintGame extends SingleGameBase {
  constructor(targetLines = 40) {
    super("game-canvas", 5, null);
    this.targetLines = targetLines;

    // タイム計測
    this.startTime = 0;
    this.elapsed   = 0;
    this._rafId    = null;

    // 重力（Sprintは一定間隔でOK）
    this._dropId   = null;
    this._dropMs   = 500; // 必要なら設定化してもよい
  }

  async start(onStateUpdate) {
    this.onStateUpdate = onStateUpdate;
    await super.start(); // ← ここで _loadSettings() 済み・spawn もされる

    // TIME表示ON/OFF（settingsから反映）
    try {
      const s = JSON.parse(localStorage.getItem("settings") || "{}");
      const showTime = (typeof s["show-time"] === "boolean") ? s["show-time"] : true;
      const timeRow = document.getElementById("clear-time")?.parentElement; // ラベル＋値の行
      if (timeRow) timeRow.style.display = showTime ? "" : "none";
    } catch {}

    // スコア系は SingleGameBase.lockAndScore() で applyClear を呼ぶので、
    // ここで reset するだけ（lines/score はそこで更新される）
    this.scoreManager.reset?.();

    // タイム計測開始
    this.startTime = performance.now();
    this._tickTime();

    // ★重力は “gravity” ソースで呼ぶ（ロック遅延の延長をしない）
    this._startGravity();
  }

  // ===== 内部 =====
  _tickTime() {
    this.elapsed = performance.now() - this.startTime;
    updateUI(this.scoreManager.getState(), this.elapsed);
    this._rafId = requestAnimationFrame(() => this._tickTime());
  }

  _startGravity() {
    if (this._dropId) clearInterval(this._dropId);
    this._dropId = setInterval(() => {
      // SingleGameBase.moveMino(dx, dy, source) : source="gravity" でロック遅延を延長しない
      this.moveMino(0, 1, "gravity");
    }, this._dropMs);
  }

  // ★SingleGameBase.lockAndScore() が onClear?.(cleared, info) を投げるので、
  //   それを2引数で受けて、linesの到達だけ監視する。
  onClear(/* cleared, info */) {
    const lines = this.scoreManager.getState()?.lines ?? 0;
    if (lines >= this.targetLines) {
      this.endGame("CLEAR!", true);
    }
  }

  onGameOver() {
    this.endGame("GAME OVER", false);
  }

  endGame(message, isClear) {
    this.isGameOver = true; // 入力・描画停止

    if (this._dropId)  { clearInterval(this._dropId); this._dropId = null; }
    if (this._rafId)   { cancelAnimationFrame(this._rafId); this._rafId = null; }
    this.render();

    const time  = this._formatTime(this.elapsed);
    const lines = this.scoreManager.getState()?.lines ?? 0;

    const box = document.getElementById("result-box");
    if (box) {
      const color = isClear ? "#00ff00" : "#ff3333";
      box.innerHTML = `
        <div class="result-message" style="color:${color};">${message}</div>
        <div class="result-lines">LINES: ${lines}</div>
        <div class="result-time">TIME: ${time}</div>
        <div class="result-buttons">
          <button onclick="location.reload()">リトライ</button>
          <button onclick="location.href='../../html/index.html'">タイトルに戻る</button>
        </div>
      `;
      box.style.display = "block";
    } else {
      alert(`${message}\nLINES: ${lines}\nTIME: ${time}`);
    }
  }

  _formatTime(ms) {
    const sec = ms / 1000;
    const mm = Math.floor(sec / 60);
    const ss = (sec % 60).toFixed(2);
    return `${mm}:${ss.padStart(5, "0")}`;
  }
}