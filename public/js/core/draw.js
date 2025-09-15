import { getBlocks } from "./mino.js";
import { getFieldSize, getSize } from "./field.js";

let canvas, ctx;
let BLOCK_SIZE = 32;

// 状態（ゲーム側が setDrawState で更新）
export let currentField = null;
export let currentMino  = null;
export let currentHold  = null;
export let nextQueue    = [];
export let nextCount    = 5;

export function initDraw(canvasEl) {
  canvas = canvasEl;
  ctx = canvas.getContext("2d");
  resizeCanvasAll();
  // リサイズは軽くディレイ
  let timer;
  window.addEventListener("resize", () => {
    clearTimeout(timer);
    timer = setTimeout(resizeCanvasAll, 150);
  });
}

export function setDrawState({ field, mino, hold, queue, count }) {
  currentField = field ?? currentField;
  currentMino  = mino  ?? currentMino;
  currentHold  = hold  ?? currentHold;
  nextQueue    = Array.isArray(queue) ? queue : nextQueue;
  if (typeof count === "number") nextCount = count;
}

// ====== 基本描画 ======
export function drawField(field) {
  if (!canvas || !ctx || !field) return;
  const { width, height } = getWH();
  clearCanvas();

  // グリッド背景
  ctx.fillStyle = "#111";
  ctx.fillRect(0,0,canvas.width,canvas.height);

  // 既存ブロック
  for (let y = 0; y < height; y++) {
    const row = field[y];
    if (!row) continue;
    for (let x = 0; x < width; x++) {
      if (row[x]) {
        fillCell(x, y, "#888");
      } else {
        // 薄いグリッド
        ctx.strokeStyle = "rgba(255,255,255,0.05)";
        ctx.strokeRect(x*BLOCK_SIZE, y*BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
      }
    }
  }
}

export function drawMino(mino) {
  if (!mino) return;
  const cells = getBlocks(mino, { absolute: true });
  ctx.fillStyle = "#0cf";
  for (const [x,y] of cells) fillCell(x,y,"#0cf");
}

export function drawGhost(field, mino) {
  if (!field || !mino) return;
  // 下に影を落とすだけ（簡易）
  let gy = mino.y;
  while (!collides(field, { ...mino, y: gy + 1 })) gy++;
  const ghost = { ...mino, y: gy };
  const cells = getBlocks(ghost, { absolute: true });
  ctx.fillStyle = "rgba(255,255,255,.15)";
  for (const [x,y] of cells) fillCell(x,y,"rgba(255,255,255,.15)");
}

export function drawHold(/* hold */) { /* 今は枠のみ扱い。必要なら拡張 */ }
export function drawNext(/* queue, count */) { /* 今は枠のみ扱い。必要なら拡張 */ }

// ====== ユーティリティ ======
function collides(field, mino) {
  const cells = getBlocks(mino, { absolute: true });
  const { width, height } = getWH();
  for (const [x,y] of cells) {
    if (x < 0 || x >= width || y >= height) return true;
    if (y >= 0 && field[y]?.[x]) return true;
  }
  return false;
}

function getWH() {
  // 互換：getFieldSize() が無い場合は getSize()
  let w,h;
  try {
    const g = getFieldSize?.() ?? {};
    w = g.width ?? g.WIDTH; h = g.height ?? g.HEIGHT;
  } catch {}
  if (!w || !h) {
    const g = getSize?.() ?? { WIDTH:10, HEIGHT:20 };
    w = g.WIDTH; h = g.HEIGHT;
  }
  return { width:w, height:h };
}

function clearCanvas() { ctx.clearRect(0,0,canvas.width,canvas.height); }

function fillCell(x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x*BLOCK_SIZE, y*BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
  ctx.strokeStyle = "#000";
  ctx.strokeRect(x*BLOCK_SIZE, y*BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
}

export function resizeCanvasAll() {
  if (!canvas) return;
  const { width, height } = getWH();
  const maxW = Math.floor(window.innerWidth  * 0.40);
  const maxH = Math.floor(window.innerHeight * 0.80);
  const bsX = Math.floor(maxW  / width);
  const bsY = Math.floor(maxH / height);
  BLOCK_SIZE = Math.max(16, Math.min(bsX, bsY));

  canvas.width  = width  * BLOCK_SIZE;
  canvas.height = height * BLOCK_SIZE;

  // リサイズ後の軽い再描画
  if (currentField) drawField(currentField);
  if (currentMino)  drawMino(currentMino);
}