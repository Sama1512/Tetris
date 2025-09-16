import { getBlocks } from "./mino.js";

const WIDTH = 10;
const HEIGHT = 20;

export function initField() {
  return Array.from({ length: HEIGHT }, () => Array(WIDTH).fill(null));
}

export function checkCollision(field, mino) {
  return getBlocks(mino).some(([x, y]) => {
    return (
      x < 0 ||
      x >= WIDTH ||
      y >= HEIGHT ||
      (y >= 0 && field[y][x])
    );
  });
}

export function placeMino(field, mino) {
  getBlocks(mino).forEach(([x, y]) => {
    if (y >= 0 && y < HEIGHT && x >= 0 && x < WIDTH) {
      field[y][x] = mino.color;
    }
  });
}

export function clearLines(field) {
  let cleared = 0;
  for (let y = field.length - 1; y >= 0; y--) {
    if (field[y].every(cell => cell)) {
      field.splice(y, 1);
      field.unshift(Array(WIDTH).fill(null));
      cleared++;
      y++;
    }
  }
  return cleared;
}

// ★全消し（Perfect Clear）：行消しがあった後、盤面が空なら true
export function isPerfectClear(field) {
  return field.every(row => row.every(cell => !cell));
}

export function getFieldSize() {
  return { width: WIDTH, height: HEIGHT };
}

// AI 用（既存）
export class Field {
  constructor() {
    this.grid = initField();
  }
  clone() {
    const newField = new Field();
    newField.grid = this.grid.map(row => [...row]);
    return newField;
  }
  check(mino) { return checkCollision(this.grid, mino); }
  place(mino) { placeMino(this.grid, mino); }
  clearLines() { clearLines(this.grid); }
}

// 末尾の export 群はそのまま、関数定義のどこかに追加
export function createEmptyField() {
  // テスター互換用。中身は initField() と同じ
  return initField();
}