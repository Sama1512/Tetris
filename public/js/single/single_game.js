import { initDraw, drawField, drawMino, drawNext, drawHold, setDrawState } from "../core/draw.js";
import { initField, checkCollision, placeMino, clearLines } from "../core/field.js";
import { getNextBag, rotateMino, cloneMino } from "../core/mino.js";
import { initInput } from "../core/input.js";
import { ScoreManager } from "../core/score.js";

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

    this.isGameOver = false; // ゲームオーバーフラグ

    this.init();
  }

  init() {
    initDraw(this.canvas);
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

  start() {
    this.reset();
    this.spawnMino();
  }

  spawnMino() {
    this.currentMino = this.nextQueue.shift();
    if (this.nextQueue.length <= 7) {
      this.nextQueue.push(...getNextBag());
    }
    this.currentMino.x = 4;
    this.currentMino.y = 0;
    this.canHold = true;

    if (checkCollision(this.field, this.currentMino)) {
      this.onGameOver?.();
    } else {
      this.render();
    }
    this.updateState();
  }

  hold() {
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
    } else if (dy === 1) {
      placeMino(this.field, this.currentMino);
      const cleared = clearLines(this.field);
      this.onClear?.(cleared);
      this.spawnMino();
    }
    this.updateState();
  }

  render() {
    drawField(this.field);
    drawMino(this.currentMino);
    drawNext(this.nextQueue, this.nextCount);
    drawHold(this.holdMino);
    setDrawState({
      field: this.field,
      mino: this.currentMino,
      queue: this.nextQueue,
      count: this.nextCount,
      hold: this.holdMino,
    });
  }

  updateState() {
    this.onStateUpdate?.({
      field: this.field,
      mino: this.currentMino,
      queue: this.nextQueue,
      count: this.nextCount,
      hold: this.holdMino,
    });
  }

  handleKey(action) {
    if (this.isGameOver) return; // GAME OVER 後は入力を無効化

    switch (action) {
      case "moveLeft": this.moveMino(-1, 0); break;
      case "moveRight": this.moveMino(1, 0); break;
      case "softDrop": this.moveMino(0, 1); break;
      case "rotateLeft": this.rotate("left"); break;
      case "rotateRight": this.rotate("right"); break;
      case "hold": this.hold(); break;
      case "hardDrop": this.hardDrop(); break;
    }
  }
}