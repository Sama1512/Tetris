import { SingleGameBase } from "../single/single_game.js";
import { initDraw, drawField, drawMino, drawGhost, setDrawState, drawNextTo, drawHoldTo } from "../core/draw.js";

/** SingleGameBase を継承し、Next/Holdの描画先をプレフィックスで切り替える */
export class PrefixedSingleGame extends SingleGameBase {
  constructor(canvasId, prefix, nextCount=5, onStateUpdate=null) {
    super(canvasId, nextCount, onStateUpdate);
    this.prefix = prefix; // 例: "player-" or "cpu-"
  }

  // ★ 追加：重力タイマーを確実に起動（フォールバック付き）
  start() {
    // 親の初期化（spawn含む）を実行
    super.start?.();

    // 既存の重力起動ルート
    try { this.updateDropSpeed?.(true); } catch {}

    // フォールバック：もし _dropId が起動してなければ、暫定重力を立てる
    setTimeout(() => {
      if (!this._dropId) {
        const ms = 800; // 初期レベル相当のゆるめ重力
        try { clearInterval(this._dropId); } catch {}
        this._dropId = setInterval(() => {
          // 'gravity' ソースでロック遅延を延長しない
          this.moveMino(0, 1, "gravity");
        }, ms);
        this._lastMs = ms;
      }
    }, 0);
  }

  render() {
    // 対象キャンバスへ切替
    const canvas = document.getElementById(this.canvas.id);
    initDraw(canvas);
    drawField(this.field);
    if (this.showGhost && this.currentMino) drawGhost(this.field, this.currentMino);
    drawMino(this.currentMino);
    // 個別のNext/Holdへ
    drawNextTo(this.nextQueue, this.nextCount, this.prefix + "next-canvas");
    drawHoldTo(this.holdMino, this.prefix + "hold-canvas");
    setDrawState({ field:this.field, mino:this.currentMino, queue:this.nextQueue, count:this.nextCount, hold:this.holdMino });
  }
}

/** とりあえず動く簡易CPU（※今は未使用：Minimaxに置換済み） */
export class SimpleCPUController {
  constructor(game) {
    this.game = game;
    this.timer = null;
  }
  start() {
    if (this.timer) return;
    this.timer = setInterval(() => {
      if (this.game.isGameOver) { this.stop(); return; }
      const x = this.game.currentMino?.x ?? 4;
      if (Math.random() < 0.5) {
        if (x < 4) this.game.handleKey("moveRight");
        else if (x > 4) this.game.handleKey("moveLeft");
      }
      if (Math.random() < 0.35) {
        this.game.handleKey(Math.random() < 0.5 ? "rotateLeft" : "rotateRight");
      }
      if (Math.random() < 0.25) {
        this.game.handleKey("hardDrop");
      } else {
        this.game.handleKey("softDrop");
      }
    }, 220);
  }
  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}