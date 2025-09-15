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

export function setDrawState({ field, mino, hold, queue, count }) {
  currentField = field;
  currentMino = mino;
  currentHold = hold;
  nextQueue = queue || [];
  nextCount = count || 5;
}

export function initDraw(canvasElement) {
  canvas = canvasElement;
  context = canvas.getContext("2d");
  resizeCanvasAll();
}

export function resizeCanvasAll() {
  const { width, height } = getFieldSize();
  const maxWidth = window.innerWidth * 0.4;
  const maxHeight = window.innerHeight * 0.8;
  const blockSizeX = Math.floor(maxWidth / width);
  const blockSizeY = Math.floor(maxHeight / height);
  BLOCK_SIZE = Math.max(16, Math.min(blockSizeX, blockSizeY));

  canvas.width = width * BLOCK_SIZE;
  canvas.height = height * BLOCK_SIZE;

  drawFieldBackground();

  // 🧠 リサイズ後の再描画
  if (currentField) drawField(currentField);
  if (currentMino) drawMino(currentMino);
  if (currentHold) drawHold(currentHold);
  if (nextQueue.length > 0) drawNext(nextQueue, nextCount);
}

function drawFieldBackground() {
  context.fillStyle = "#000";
  context.fillRect(0, 0, canvas.width, canvas.height);
}

export function drawField(field) {
  drawFieldBackground();
  for (let y = 0; y < field.length; y++) {
    for (let x = 0; x < field[y].length; x++) {
      if (field[y][x]) {
        drawBlock(x, y, field[y][x]);
      }
    }
  }
}

export function drawMino(mino) {
  getBlocks(mino).forEach(([x, y]) => {
    drawBlock(x, y, mino.color);
  });
}

function drawBlock(x, y, color) {
  context.fillStyle = color;
  context.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
  context.strokeStyle = "#333";
  context.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
}

export function drawHold(mino) {
  const holdArea = document.getElementById("hold-canvas");
  if (!holdArea || !mino) return;

  const ctx = holdArea.getContext("2d");
  const canvasSize = 4 * BLOCK_SIZE;

  holdArea.width = canvasSize;
  holdArea.height = canvasSize;
  ctx.clearRect(0, 0, canvasSize, canvasSize);

  const blocks = getBlocks(mino);
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

  ctx.fillStyle = mino.color;
  blocks.forEach(([x, y]) => {
    const drawX = (x + offsetX) * BLOCK_SIZE;
    const drawY = (y + offsetY) * BLOCK_SIZE;
    ctx.fillRect(drawX, drawY, BLOCK_SIZE, BLOCK_SIZE);
    ctx.strokeStyle = "#333";
    ctx.strokeRect(drawX, drawY, BLOCK_SIZE, BLOCK_SIZE);
  });
}


// 透過ゴースト描画
export function drawGhost(field, mino) {
  if (!field || !mino) return;
  // ゴースト位置を計算
  const ghost = {
    type: mino.type,
    rotation: mino.rotation,
    x: mino.x,
    y: mino.y,
    blocks: mino.blocks,
    color: mino.color,
  };

  // フィールドサイズ（固定10x20想定だが保険）
  const h = field.length;
  const w = field[0]?.length ?? 10;

  // 衝突チェックの簡易版
  const collides = (m) => {
    const blocks = getBlocks(m);
    for (const [bx, by] of blocks) {
      if (bx < 0 || bx >= w || by >= h) return true;
      if (by >= 0 && field[by][bx]) return true;
    }
    return false;
  };

  // 下に落とし続け、衝突直前まで移動
  while (true) {
    const next = { ...ghost, y: ghost.y + 1 };
    if (collides(next)) break;
    ghost.y += 1;
  }

  // 半透明で描画
  const ctx = context;
  ctx.save();
  ctx.globalAlpha = 0.3;
  const blocks = getBlocks(ghost);
  blocks.forEach(([x, y]) => {
    if (y < 0) return; // 画面外は無視
    const drawX = x * BLOCK_SIZE;
    const drawY = y * BLOCK_SIZE;
    ctx.fillStyle = ghost.color || "gray";
    ctx.fillRect(drawX, drawY, BLOCK_SIZE, BLOCK_SIZE);
    ctx.strokeStyle = "#333";
    ctx.strokeRect(drawX, drawY, BLOCK_SIZE, BLOCK_SIZE);
  });
  ctx.restore();
}
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

    const offsetX = Math.floor((5 - minoWidth) / 2) - minX;
    const offsetY = Math.floor((4 - minoHeight) / 2) - minY;
    const startY = i * (previewHeight + spacing);

    ctx.fillStyle = mino.color;
    blocks.forEach(([dx, dy]) => {
      const x = (dx + offsetX) * BLOCK_SIZE;
      const y = startY + (dy + offsetY) * BLOCK_SIZE;
      ctx.fillRect(x, y, BLOCK_SIZE, BLOCK_SIZE);
      ctx.strokeStyle = "#000";
      ctx.strokeRect(x, y, BLOCK_SIZE, BLOCK_SIZE);
    });
  }
}

// 📏 リサイズを最適化（debounce）
let resizeTimeout;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    if (canvas) resizeCanvasAll();
  }, 200);
});