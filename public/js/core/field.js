// 10x20 フィールド / 互換API全部乗せ（getFieldSize, WIDTH/HEIGHT など）

export const WIDTH = 10;
export const HEIGHT = 20;
export const FIELD_WIDTH = WIDTH;
export const FIELD_HEIGHT = HEIGHT;

export function createEmptyField() {
  return Array.from({ length: HEIGHT }, () => Array(WIDTH).fill(0));
}

export function initField() {
  return createEmptyField();
}

export function getSize() {
  return { WIDTH, HEIGHT };
}

// ★互換：小文字 {width,height} も返す
export function getFieldSize() {
  return { width: WIDTH, height: HEIGHT, WIDTH, HEIGHT };
}

export function getWidth()  { return WIDTH; }
export function getHeight() { return HEIGHT; }

export function checkCollision(field, mino) {
  if (!mino || !mino.shape) return true; // 未初期化は衝突扱いで安全
  const s = mino.shape;
  for (let y = 0; y < s.length; y++) {
    for (let x = 0; x < s[0].length; x++) {
      if (!s[y][x]) continue;
      const fx = (mino.x | 0) + x;
      const fy = (mino.y | 0) + y;
      if (fx < 0 || fx >= WIDTH || fy >= HEIGHT) return true;
      if (fy >= 0 && field[fy]?.[fx]) return true;
    }
  }
  return false;
}

export function placeMino(field, mino) {
  if (!mino || !mino.shape) return;
  const s = mino.shape;
  for (let y = 0; y < s.length; y++) {
    for (let x = 0; x < s[0].length; x++) {
      if (!s[y][x]) continue;
      const fx = (mino.x | 0) + x;
      const fy = (mino.y | 0) + y;
      if (fy >= 0 && fy < HEIGHT && fx >= 0 && fx < WIDTH) {
        field[fy][fx] = 1; // 色IDを入れたいならここを拡張
      }
    }
  }
}

export function clearLines(field) {
  let cleared = 0;
  for (let y = HEIGHT - 1; y >= 0; y--) {
    const row = field[y];
    if (!row) continue;
    if (row.every(v => v !== 0)) {
      field.splice(y, 1);
      field.unshift(new Array(WIDTH).fill(0));
      cleared++;
      y++;
    }
  }
  return cleared;
}

export function isPerfectClear(field) {
  for (let y = 0; y < HEIGHT; y++) {
    const row = field[y];
    if (!row) return false;
    for (let x = 0; x < WIDTH; x++) {
      if (row[x] !== 0) return false;
    }
  }
  return true;
}