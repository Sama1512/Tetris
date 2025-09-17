// 10LINEごとにレベル+1。
// 重力ループは“間隔が変わった時だけ”再起動（ログもその時だけ）。
import { SingleGameBase } from "./single_game.js";
import { updateUI } from "../ui/ui.js";

export class MarathonGame extends SingleGameBase {
  constructor(canvasId = "game-canvas", nextCount = 5, onStateUpdate = null) {
    super(canvasId, nextCount, onStateUpdate);
    this.level = 1;

    this._dropId = null;   // setIntervalハンドル
    this._lastMs = -1;     // 直近で使った重力間隔
  }

  // レベル→落下間隔(ms)。必要なら好みでテーブルを調整してOK
  getDropIntervalMs() {
    const table = [1000, 800, 700, 600, 500, 450, 400, 350, 300, 260, 230, 200, 180, 160, 140, 120, 100];
    return table[Math.min(Math.max(this.level, 1) - 1, table.length - 1)];
  }

  async start(onStateUpdate) {
    this.onStateUpdate = onStateUpdate ?? this.onStateUpdate;
    await super.start(); // reset() と spawnMino()

    // 初回起動（必要時のみログ）
    this._restartGravity(true);

    // タブ非表示→停止／復帰→再開
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        if (this._dropId) { clearInterval(this._dropId); this._dropId = null; }
      } else {
        this._restartGravity(false);
      }
    });
  }

  // 重力ループを“必要なときだけ”作り直す（間隔が同じなら何もしない）
  _restartGravity(shouldLog) {
    const ms = this.getDropIntervalMs();
    if (ms === this._lastMs && this._dropId) return; // 変更なし：再起動不要

    if (this._dropId) { clearInterval(this._dropId); this._dropId = null; }
    this._dropId = setInterval(() => {
      // ★重力は 'gravity' ソースで呼ぶ（ロック遅延の延長をしない）
      this.moveMino(0, 1, "gravity");
    }, ms);

    this._lastMs = ms;
    if (shouldLog) console.log(`🕒 Drop interval started: ${ms}ms (level ${this.level})`);
  }

  // 10LINE毎に level = floor(lines/10)+1 として再計算。
  // 変化があった時だけ重力を再起動＆ScoreManager.levelにも反映。
  updateDropSpeed(force = false) {
    const st = this.scoreManager.getState?.() || { lines: 0, level: 1 };
    const lines = Number(st.lines) || 0;
    const newLevel = Math.floor(lines / 10) + 1;

    if (!force && newLevel === this.level) return; // レベル変わってないなら何もしない
    this.level = newLevel;
    // HUD側がscoreManager.levelを参照している場合のために同期
    if (this.scoreManager) this.scoreManager.level = this.level;

    this._restartGravity(true);
  }

  // SingleGameBase.lockAndScore() から onClear が飛んでくる（2引数）
  onClear(/* lines, info */) {
    // 行数は applyClear 側で更新済み。ここではレベルだけ追従。
    this.updateDropSpeed(false);
  }

  onGameOver() {
    if (this._dropId) { clearInterval(this._dropId); this._dropId = null; }
    this.endGame("GAME OVER", false);
  }

  onClearFinish() {
    if (this._dropId) { clearInterval(this._dropId); this._dropId = null; }
    this.endGame("CLEAR!", true);
  }

  endGame(message, isClear) {
    this.isGameOver = true;
    this.render();

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
    // HUD にも level を反映したいので、状態に上書きして渡す
    const st = this.scoreManager.getState?.() || {};
    updateUI({ ...st, level: this.level });
    super.render();
  }
}