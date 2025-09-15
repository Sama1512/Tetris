// public/js/single/single_game.js
// フェーズ1版に最小変更：T-Spin判定の呼び出しだけ追加
import { initDraw, drawField, drawMino, drawNext, drawHold, setDrawState, drawGhost } from "../core/draw.js";
import { initField, checkCollision, placeMino, clearLines, isPerfectClear } from "../core/field.js";
import { getNextBag, rotateMino, cloneMino } from "../core/mino.js";
import { initInput } from "../core/input.js";
import { ScoreManager } from "../core/score.js";
import { classifyTSpinStrict } from "../core/tspin.js"; // ★追加

export class SingleGameBase {
  constructor(canvasId, nextCount = 5, onStateUpdate = null) {
    this.canvas = document.getElementById(canvasId);
    this.currentMino = null;
    this.holdMino = null;
    this.canHold = true;
    this.nextQueue = [];
    this.field = initField();
    this.nextCount = nextCount;
    this.onStateUpdate = onStateUpdate;
    this.scoreManager = new ScoreManager();
    this.isGameOver = false;

    // ★追加：T-Spin用フラグ（「直前操作が回転だったか」）
    this.lastSpin = { rotated: false };

    this._renderQueued = false;
    this._boundHandleKey = this.handleKey.bind(this);

    this._initPromise = this.init();
  }

  async init() {
    initDraw(this.canvas);

    // 初期描画レース対策（空ステート）
    setDrawState({ field:this.field, mino:null, hold:null, queue:[], count:this.nextCount });

    initInput(this._boundHandleKey);
  }

  reset() {
    this.field = initField();
    this.nextQueue = [...getNextBag()];
    while (this.nextQueue.length < this.nextCount) this.nextQueue.push(...getNextBag());
    this.holdMino = null;
    this.canHold = true;
    this.scoreManager.reset?.();
    this.isGameOver = false;
    this.lastSpin = { rotated:false };
    this.requestRender();
  }

  async start() {
    await this._initPromise;
    this.reset();
    this.spawnMino();
  }

  spawnMino() {
    if (this.nextQueue.length < this.nextCount + 1) this.nextQueue.push(...getNextBag());
    this.currentMino = this.nextQueue.shift();
    this.currentMino.x = 3; this.currentMino.y = 0;

    if (checkCollision(this.field, this.currentMino)) { this.isGameOver = true; this.onGameOver?.(); }
    this.canHold = true;
    this.lastSpin = { rotated:false };
    this.requestRender();
  }

  hold() {
    if (!this.canHold) return;
    const temp = this.holdMino;
    this.holdMino = cloneMino(this.currentMino);
    if (temp) { this.currentMino = cloneMino(temp); }
    else { this.currentMino = this.nextQueue.shift(); this.nextQueue.push(...getNextBag()); }
    this.currentMino.x = 3; this.currentMino.y = 0;
    this.canHold = false;
    this.lastSpin = { rotated:false }; // ホールドは回転扱いじゃない
    this.requestRender();
  }

  rotate(dir) {
    // 既存の回転ロジックはそのまま
    const rr = rotateMino(this.currentMino, dir, this.field, checkCollision);
    const rotated =
      rr.mino.r !== this.currentMino.r ||
      rr.mino.x !== this.currentMino.x ||
      rr.mino.y !== this.currentMino.y;
    if (rotated) {
      this.currentMino = rr.mino;
      this.lastSpin = { rotated:true }; // ★回転フラグを立てる
      this.requestRender();
    }
  }

  hardDrop() {
    while (!checkCollision(this.field, { ...this.currentMino, y: this.currentMino.y + 1 })) this.currentMino.y++;
    this.lockAndScore();
  }

  moveMino(dx, dy) {
    const next = { ...this.currentMino, x: this.currentMino.x + dx, y: this.currentMino.y + dy };
    if (!checkCollision(this.field, next)) {
      this.currentMino = next;
      if (dy !== 0) this.lastSpin = { rotated:false }; // ★縦移動したら回転フラグを落とす（厳密化）
      this.requestRender();
    } else if (dy !== 0) {
      this.lockAndScore();
    }
  }

  lockAndScore() {
    // 1) 盤へ設置
    placeMino(this.field, this.currentMino);

    // 2) 消去“前”の盤をスナップ（T-Spinの角判定は消去前盤で行う）
    const fieldBeforeClear = this.field.map(r => r.slice());

    // 3) ライン消去
    const lines = clearLines(this.field);

    // 4) T-Spin/Mini の分類（フェーズ1に薄く追加）
    const kind = classifyTSpinStrict(this.currentMino, fieldBeforeClear, this.lastSpin, lines);
    // ここで回転フラグはリセットしておくのが安全
    this.lastSpin = { rotated:false };

    // 5) スコアはフェーズ1のまま（必要なら既存のメソッド呼び出し）
    //   - フェーズ2で B2B/REN を入れるときに拡張する
    //   - 既存 onClear を使ってUIに渡しておく（互換）
    const pc = (lines > 0) && isPerfectClear(this.field);
    this.onClear?.(lines, { type: kind, perfectClear: pc });

    // 6) 次のミノ
    this.spawnMino();
  }

  // rAFで再入防止描画（既存）
  requestRender() {
    if (this._renderQueued) return;
    this._renderQueued = true;
    requestAnimationFrame(() => { this._renderQueued = false; this.renderNow(); });
  }

  renderNow() {
    setDrawState({ field:this.field, mino:this.currentMino, hold:this.holdMino, queue:this.nextQueue, count:this.nextCount });
    drawField(this.field);
    drawGhost(this.field, this.currentMino);
    drawMino(this.currentMino);
    drawHold(this.holdMino);
    drawNext(this.nextQueue, this.nextCount);
    this.onStateUpdate?.({ score: this.scoreManager.getState?.() });
  }

  handleKey(action) {
    if (this.isGameOver) return;
    switch (action) {
      case "moveLeft":  this.moveMino(-1, 0); break;
      case "moveRight": this.moveMino( 1, 0); break;
      case "softDrop":  this.moveMino( 0, 1); break;
      case "rotateLeft":  this.rotate("left");  break;
      case "rotateRight": this.rotate("right"); break;
      case "hold": this.hold(); break;
      case "hardDrop": this.hardDrop(); break;
    }
  }
}