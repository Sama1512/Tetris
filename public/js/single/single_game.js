import { initDraw, drawField, drawMino, drawNext, drawHold, setDrawState, drawGhost } from "../core/draw.js";
import { initField, checkCollision, placeMino, clearLines, isPerfectClear } from "../core/field.js";
import { getNextBag, rotateMino, cloneMino } from "../core/mino.js";
import { classifyTSpinStrict } from "../core/tspin.js";
import { initInput } from "../core/input.js";
import { getSettings } from "../ui/settings_runtime.js";
import { ScoreManager } from "../core/score.js";
import { Effects } from "../ui/effectManager.js";

export class SingleGameBase {
  constructor(canvasId, nextCount = 5, onStateUpdate = null) {
    this.settings = null;
    this.enableHold = true;
    this.enableHardDrop = true;
    this.reverseRotation = false;
    this.showGhost = true;

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

    this.lastSpin = { rotated: false, kicked: false };
    this.effects = null;

    this._renderQueued = false;

    // bind安全化：必ず存在するハンドラを渡す
    this._boundHandleKey =
      (typeof this.handleKey === "function") ? this.handleKey.bind(this) : (_)=>{};

    this._initPromise = this.init();
  }

  async init() {
    initDraw(this.canvas);

    // 初期描画レース対策（空ステート）
    setDrawState({
      field: this.field,
      mino: null,
      hold: null,
      queue: [],
      count: this.nextCount,
      hud: this.scoreManager.getState?.(),
    });

    // 設定ロード
    this.settings = await getSettings();
    this.enableHold = this.settings["enable-hold"] ?? true;
    this.enableHardDrop = this.settings["enable-harddrop"] ?? true;
    this.reverseRotation = this.settings["reverse-rotation"] ?? false;
    this.showGhost = this.settings["show-ghost"] ?? true;
    const nextCountSetting = this.settings["next-count"];
    if (typeof nextCountSetting === "number" && nextCountSetting > 0) {
      this.nextCount = nextCountSetting;
    }

    const holdWrapper = document.getElementById("hold-wrapper");
    if (holdWrapper) holdWrapper.style.display = this.enableHold ? "" : "none";

    // 演出
    this.effects = new Effects(this.canvas);

    // 入力
    if (typeof initInput === "function") {
      initInput(this._boundHandleKey);
    } else {
      console.warn("[SingleGameBase] initInput が見つかりません。入力は無効になります。");
    }
  }

  reset() {
    this.field = initField();
    this.nextQueue = [...getNextBag()];
    while (this.nextQueue.length < this.nextCount) this.nextQueue.push(...getNextBag());
    this.holdMino = null;
    this.canHold = true;
    this.scoreManager.reset?.();
    this.isGameOver = false;
    this.lastSpin = { rotated: false, kicked: false };
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

    if (checkCollision(this.field, this.currentMino)) {
      this.isGameOver = true;
      this.onGameOver?.();
    }
    this.canHold = true;
    this.lastSpin = { rotated: false, kicked: false };
    this.requestRender();
  }

  hold() {
    if (!this.enableHold || !this.canHold) return;
    const temp = this.holdMino;
    this.holdMino = cloneMino(this.currentMino);
    if (temp) this.currentMino = cloneMino(temp);
    else {
      this.currentMino = this.nextQueue.shift();
      this.nextQueue.push(...getNextBag());
    }
    this.currentMino.x = 3; this.currentMino.y = 0;
    this.canHold = false;
    this.lastSpin = { rotated: false, kicked: false };
    this.requestRender();
  }

  rotate(dir) {
    const rr = rotateMino(this.currentMino, dir, this.field, checkCollision);
    const rotated =
      rr.mino.r !== this.currentMino.r ||
      rr.mino.x !== this.currentMino.x ||
      rr.mino.y !== this.currentMino.y;
    if (rotated) {
      this.currentMino = rr.mino;
      this.lastSpin = { rotated: true, kicked: rr.kicked };
      this.requestRender();
    }
  }

  hardDrop() {
    if (!this.enableHardDrop) return;
    while (!checkCollision(this.field, { ...this.currentMino, y: this.currentMino.y + 1 })) {
      this.currentMino.y++;
    }
    this.lockAndScore();
  }

  moveMino(dx, dy) {
    const next = { ...this.currentMino, x: this.currentMino.x + dx, y: this.currentMino.y + dy };
    if (!checkCollision(this.field, next)) {
      this.currentMino = next;
      if (dy !== 0) this.lastSpin = { rotated: false, kicked: false };
      this.requestRender();
    } else if (dy !== 0) {
      this.lockAndScore();
    }
  }

  lockAndScore() {
    placeMino(this.field, this.currentMino);

    const fieldBeforeClear = this.field.map(row => row.slice());
    const lines = clearLines(this.field);

    const kind = classifyTSpinStrict(this.currentMino, fieldBeforeClear, this.lastSpin, lines);
    const pc = (lines > 0) && isPerfectClear(this.field);

    const res = this.scoreManager.applyClear({ lines, type: kind, perfectClear: pc });

    this.effects?.onClear({ lines, type: kind, b2b: res.b2b, combo: res.combo, perfectClear: pc });

    this.onClear?.(lines, { type: kind, perfectClear: pc, b2b: res.b2b, combo: res.combo, added: res.added });

    this.spawnMino();
  }

  // --- 描画は rAF で再入防止 ---
  requestRender() {
    if (this._renderQueued) return;
    this._renderQueued = true;
    requestAnimationFrame(() => {
      this._renderQueued = false;
      this.renderNow();
    });
  }

  renderNow() {
    setDrawState({
      field: this.field,
      mino: this.currentMino,
      hold: this.holdMino,
      queue: this.nextQueue,
      count: this.nextCount,
      hud: this.scoreManager.getState?.(),
    });

    drawField(this.field);
    if (this.showGhost && this.currentMino && this.currentMino.shape) {
      drawGhost(this.field, this.currentMino);
    }
    drawMino(this.currentMino);
    drawHold(this.holdMino);
    drawNext(this.nextQueue, this.nextCount);

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
    if (this.isGameOver) return;
    switch (action) {
      case "moveLeft":  this.moveMino(-1, 0); break;
      case "moveRight": this.moveMino( 1, 0); break;
      case "softDrop":  this.moveMino( 0, 1); break;
      case "rotateLeft":
        this.reverseRotation ? this.rotate("right") : this.rotate("left"); break;
      case "rotateRight":
        this.reverseRotation ? this.rotate("left")  : this.rotate("right"); break;
      case "hold":     if (this.enableHold)     this.hold();     break;
      case "hardDrop": if (this.enableHardDrop) this.hardDrop(); break;
    }
  }
}