import { getBlocks } from "./mino.js";
import { getFieldSize } from "./field.js";

let canvas, context;
let BLOCK_SIZE = 32;

// 状態保持（外部で代入してください）
export let currentField = null;
export let currentMino = null;
export let currentHold = null;
export let nextQueue = [];
export let nextCount = 5;

/**
 * 外部（ゲームロジック）から現在の描画状態を受け取ってキャッシュ。
 * render() 内ではこの状態を参照する。
 */
export function setDrawState({ field, mino, hold, queue, count }) {
  currentField = field;
  currentMino = mino;
  currentHold = hold;
  nextQueue = queue || [];
  nextCount = Number.isFinite(count) ? count : 5;
}

/**
 * キャンバスを初期化し、画素サイズ(BLOCK_SIZE)を算出
 */
export function initDraw(canvasElement) {
  canvas = canvasElement;
  context = canvas.getContext("2d");
  resizeCanvasAll();
}

/**
 * 画面サイズに応じてキャンバスの実ピクセルを調整
 */
export function resizeCanvasAll() {
  const { width, height } = getFieldSize();
  const maxWidth = window.innerWidth * 0.4;
  const maxHeight = window.innerHeight * 0.8;
  const blockSizeX = Math.floor(maxWidth / width);
  const blockSizeY = Math.floor(maxHeight / height);
  BLOCK_SIZE = Math.max(16, Math.min(blockSizeX, blockSizeY));

  canvas.width = width * BLOCK_SIZE;
  canvas.height = height * BLOCK_SIZE;

  // 再描画（状態があれば）
  if (currentField) {
    drawField(currentField);
    if (currentMino) drawMino(currentMino);
  }
}

/** 背景の薄いグリッド */
function drawFieldBackground() {
  const { width, height } = getFieldSize();
  context.fillStyle = "#101418";
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.strokeStyle = "rgba(255,255,255,0.06)";
  context.lineWidth = 1;
  for (let x = 0; x <= width; x++) {
    const px = x * BLOCK_SIZE + 0.5;
    context.beginPath();
    context.moveTo(px, 0);
    context.lineTo(px, canvas.height);
    context.stroke();
  }
  for (let y = 0; y <= height; y++) {
    const py = y * BLOCK_SIZE + 0.5;
    context.beginPath();
    context.moveTo(0, py);
    context.lineTo(canvas.width, py);
    context.stroke();
  }
}

/** 単ブロック描画 */
function drawBlock(x, y, color) {
  const px = x * BLOCK_SIZE;
  const py = y * BLOCK_SIZE;
  context.fillStyle = color || "#66c";
  context.fillRect(px, py, BLOCK_SIZE, BLOCK_SIZE);
  context.strokeStyle = "rgba(0,0,0,0.4)";
  context.strokeRect(px, py, BLOCK_SIZE, BLOCK_SIZE);
}

/** 盤面の固定ブロック群 */
export function drawField(field) {
  drawFieldBackground();
  for (let y = 0; y < field.length; y++) {
    for (let x = 0; x < field[y].length; x++) {
      if (field[y][x]) {
        drawBlock(x, y, field[y][x].color || field[y][x]);
      }
    }
  }
}

/** 操作中ミノ */
export function drawMino(mino) {
  if (!mino) return;
  getBlocks(mino).forEach(([x, y]) => {
    if (y < 0) return; // 出現時に上部がはみ出すことがある
    drawBlock(x, y, mino.color);
  });
}

/** ゴースト（落下予測） */
export function drawGhost(field, mino) {
  if (!mino) return;
  // 落とせる所まで下げる
  let ghostY = mino.y;
  const test = (obj) => {
    return getBlocks(obj).some(([x, y]) => {
      const out = (
        x < 0 ||
        y >= field.length ||
        x >= field[0].length ||
        (y >= 0 && field[y][x])
      );
      return out;
    });
  };
  while (!test({ ...mino, y: ghostY + 1 })) ghostY++;

  const ghost = { ...mino, y: ghostY };
  context.save();
  context.globalAlpha = 0.25;
  getBlocks(ghost).forEach(([x, y]) => {
    if (y < 0) return;
    drawBlock(x, y, mino.color || "#fff");
  });
  context.restore();
}

/** NEXT（標準：#next-canvas を使う） */
export function drawNext(queue, count) {
  const canvas = document.getElementById("next-canvas");
  const ctx = canvas.getContext("2d");
  const spacing = BLOCK_SIZE / 2;
  const previewHeight = BLOCK_SIZE * 4;

  canvas.width = BLOCK_SIZE * 5;
  canvas.height = count * (previewHeight + spacing);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < count; i++) {
    const mino = queue[i];
    if (!mino) continue;

    const blocks = mino.blocks;
    const xs = blocks.map(([x, _]) => x);
    const ys = blocks.map(([_, y]) => y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const minoWidth = maxX - minX + 1;
    const minoHeight = maxY - minY + 1;

    const offsetX = Math.floor((4 - minoWidth) / 2) - minX;
    const offsetY = Math.floor((4 - minoHeight) / 2) - minY;

    const ox = BLOCK_SIZE * 0.5;
    const oy = i * (previewHeight + spacing) + BLOCK_SIZE * 0.5;

    ctx.fillStyle = mino.color;
    blocks.forEach(([x, y]) => {
      const px = ox + (x + offsetX) * BLOCK_SIZE;
      const py = oy + (y + offsetY) * BLOCK_SIZE;
      ctx.fillRect(px, py, BLOCK_SIZE, BLOCK_SIZE);
      ctx.strokeStyle = "#000";
      ctx.strokeRect(px, py, BLOCK_SIZE, BLOCK_SIZE);
    });
  }
}

/** HOLD（標準：#hold-canvas を使う） */
export function drawHold(hold) {
  const canvas = document.getElementById("hold-canvas");
  const ctx = canvas.getContext("2d");
  const previewHeight = BLOCK_SIZE * 4;
  canvas.width = BLOCK_SIZE * 5;
  canvas.height = previewHeight + BLOCK_SIZE;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!hold) return;
  const blocks = hold.blocks;
  const xs = blocks.map(([x, _]) => x);
  const ys = blocks.map(([_, y]) => y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const minoWidth = maxX - minX + 1;
  const minoHeight = maxY - minY + 1;

  const offsetX = Math.floor((4 - minoWidth) / 2) - minX;
  const offsetY = Math.floor((4 - minoHeight) / 2) - minY;

  ctx.fillStyle = hold.color;
  blocks.forEach(([x, y]) => {
    const px = BLOCK_SIZE * (x + offsetX + 1);
    const py = BLOCK_SIZE * (y + offsetY + 1);
    ctx.fillRect(px, py, BLOCK_SIZE, BLOCK_SIZE);
    ctx.strokeStyle = "#000";
    ctx.strokeRect(px, py, BLOCK_SIZE, BLOCK_SIZE);
  });
}

/* =========================
   ここから対戦用の追加API
   ========================= */

/**
 * 対戦用：NEXT を指定キャンバスへ描画
 * 例) drawNextTo(queue, count, "player-next-canvas")
 */
export function drawNextTo(queue, count, canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const spacing = BLOCK_SIZE / 2;
  const previewHeight = BLOCK_SIZE * 4;

  canvas.width = BLOCK_SIZE * 5;
  canvas.height = count * (previewHeight + spacing);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < count; i++) {
    const mino = queue[i];
    if (!mino) continue;
    const blocks = mino.blocks;
    const xs = blocks.map(([x, _]) => x);
    const ys = blocks.map(([_, y]) => y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const minoWidth = maxX - minX + 1;
    const minoHeight = maxY - minY + 1;
    const offsetX = Math.floor((4 - minoWidth) / 2) - minX;
    const offsetY = Math.floor((4 - minoHeight) / 2) - minY;
    const ox = BLOCK_SIZE * 0.5;
    const oy = i * (previewHeight + spacing) + BLOCK_SIZE * 0.5;

    ctx.fillStyle = mino.color;
    blocks.forEach(([x, y]) => {
      const px = ox + (x + offsetX) * BLOCK_SIZE;
      const py = oy + (y + offsetY) * BLOCK_SIZE;
      ctx.fillRect(px, py, BLOCK_SIZE, BLOCK_SIZE);
      ctx.strokeStyle = "#000";
      ctx.strokeRect(px, py, BLOCK_SIZE, BLOCK_SIZE);
    });
  }
}

/**
 * 対戦用：HOLD を指定キャンバスへ描画
 * 例) drawHoldTo(hold, "cpu-hold-canvas")
 */
export function drawHoldTo(hold, canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const previewHeight = BLOCK_SIZE * 4;
  canvas.width = BLOCK_SIZE * 5;
  canvas.height = previewHeight + BLOCK_SIZE;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!hold) return;
  const blocks = hold.blocks;
  const xs = blocks.map(([x, _]) => x);
  const ys = blocks.map(([_, y]) => y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const minoWidth = maxX - minX + 1;
  const minoHeight = maxY - minY + 1;
  const offsetX = Math.floor((4 - minoWidth) / 2) - minX;
  const offsetY = Math.floor((4 - minoHeight) / 2) - minY;

  ctx.fillStyle = hold.color;
  blocks.forEach(([x, y]) => {
    const px = BLOCK_SIZE * (x + offsetX + 1);
    const py = BLOCK_SIZE * (y + offsetY + 1);
    ctx.fillRect(px, py, BLOCK_SIZE, BLOCK_SIZE);
    ctx.strokeStyle = "#000";
    ctx.strokeRect(px, py, BLOCK_SIZE, BLOCK_SIZE);
  });
}

// 📏 リサイズを最適化（debounce）
let resizeTimeout;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    if (canvas) resizeCanvasAll();
  }, 200);
});