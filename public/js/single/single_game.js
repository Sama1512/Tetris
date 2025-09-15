import { initDraw, drawField, drawMino, drawNext, drawHold, setDrawState, drawGhost } from "../core/draw.js";
import { initField, checkCollision, placeMino, clearLines } from "../core/field.js";
import { getNextBag, rotateMino, cloneMino } from "../core/mino.js";
import { initInput } from "../core/input.js";
import { getSettings } from "../ui/settings_runtime.js";
import { ScoreManager } from "../core/score.js";

export class SingleGameBase {
  constructor(canvasId, nextCount = 5, onStateUpdate = null) {
    // 設定フラグ（init時に上書き）
    this.settings = null;
    this.enableHold = true;
    this.enableHardDrop = true;
    this.reverseRotation = false;
    this.showGhost = true;

    // ゲーム状態
    this.canvas = document.getElementById(canvasId);
    this.currentMino = null;
    this.holdMino = null;
    this.canHold = true;
    this.nextQueue = [];
    this.field = initField();
    this.nextCount = nextCount;
    this.onStateUpdate = onStateUpdate;
    this.scoreManager = new ScoreManager();
    this.isGameOver = false; // ゲームオーバーフラグ

    // 初期化
    this._initPromise = this.init();
  }

  async init() {
    initDraw(this.canvas);

    // 設定ロード（localStorage優先 → config/settings.json）
    this.settings = await getSettings();
    this.enableHold = this.settings["enable-hold"] ?? true;
    this.enableHardDrop = this.settings["enable-harddrop"] ?? true;
    this.reverseRotation = this.settings["reverse-rotation"] ?? false;
    this.showGhost = this.settings["show-ghost"] ?? true;
    const nextCountSetting = this.settings["next-count"];
    if (typeof nextCountSetting === "number" && nextCountSetting > 0) {
      this.nextCount = nextCountSetting;
    }

    // HOLDパネルの表示/非表示
    const holdWrapper = document.getElementById("hold-wrapper");
    if (holdWrapper) {
      holdWrapper.style.display = this.enableHold ? "" : "none";
    }

    // 入力初期化
    initInput(this.handleKey.bind(this));
  }

  reset() {
    this.field = initField();
    this.nextQueue = [...getNextBag()];
    while (this.nextQueue.length < this.nextCount) {
      this.nextQueue.push(...getNextBag());
    }
    this.holdMino = null;
    this.canHold = true;
    this.scoreManager.reset?.();
    this.isGameOver = false; // 再スタート時にリセット
    this.updateState();
  }

  async start() {
    // init完了を保証してから開始
    await this._initPromise;
    this.reset();
    this.spawnMino();
  }

  spawnMino() {
    if (this.nextQueue.length < this.nextCount + 1) {
      this.nextQueue.push(...getNextBag());
    }
    this.currentMino = this.nextQueue.shift();
    if (checkCollision(this.field, this.currentMino)) {
      this.isGameOver = true;
      this.onGameOver?.();
    }
    this.canHold = true;
    this.render();
  }

  hold() {
    if (!this.enableHold) return;
    if (!this.canHold) return;
    const temp = this.holdMino;
    this.holdMino = cloneMino(this.currentMino);
    if (temp) {
      this.currentMino = cloneMino(temp);
    } else {
      this.currentMino = this.nextQueue.shift();
      this.nextQueue.push(...getNextBag());
    }
    this.currentMino.x = 4;
    this.currentMino.y = 0;
    this.canHold = false;
    this.render();
  }

  rotate(dir) {
    const rotated = rotateMino(this.currentMino, dir);
    if (!checkCollision(this.field, rotated)) {
      this.currentMino = rotated;
      this.render();
    }
  }

  hardDrop() {
    if (!this.enableHardDrop) return;
    while (!checkCollision(this.field, { ...this.currentMino, y: this.currentMino.y + 1 })) {
      this.currentMino.y++;
    }
    placeMino(this.field, this.currentMino);
    const cleared = clearLines(this.field);
    this.onClear?.(cleared);
    this.spawnMino();
  }

  moveMino(dx, dy) {
    const next = { ...this.currentMino, x: this.currentMino.x + dx, y: this.currentMino.y + dy };
    if (!checkCollision(this.field, next)) {
      this.currentMino = next;
      this.render();
    } else if (dy !== 0) {
      // 下方向に衝突 → 設置
      placeMino(this.field, this.currentMino);
      const cleared = clearLines(this.field);
      this.onClear?.(cleared);
      this.spawnMino();
    }
  }

  render() {
    setDrawState({
      field: this.field,
      mino: this.currentMino,
      hold: this.holdMino,
      queue: this.nextQueue,
      count: this.nextCount,
    });
    drawField(this.field);
    if (this.showGhost) {
      drawGhost(this.field, this.currentMino);
    }
    drawMino(this.currentMino);
    drawHold(this.holdMino);
    drawNext(this.nextQueue, this.nextCount);
    this.updateState();
  }

  updateState() {
    this.onStateUpdate?.({
      field: this.field,
      currentMino: this.currentMino,
      holdMino: this.holdMino,
      nextQueue: this.nextQueue,
      score: this.scoreManager.getState?.(),
      isGameOver: this.isGameOver,
    });
  }

  handleKey(action) {
    if (this.isGameOver) return; // GAME OVER 後は入力を無効化

    switch (action) {
      case "moveLeft": this.moveMino(-1, 0); break;
      case "moveRight": this.moveMino(1, 0); break;
      case "softDrop": this.moveMino(0, 1); break;
      case "rotateLeft":
        if (this.reverseRotation) { this.rotate("right"); } else { this.rotate("left"); }
        break;
      case "rotateRight":
        if (this.reverseRotation) { this.rotate("left"); } else { this.rotate("right"); }
        break;
      case "hold":
        if (this.enableHold) this.hold();
        break;
      case "hardDrop":
        if (this.enableHardDrop) this.hardDrop();
        break;
    }
  }
}