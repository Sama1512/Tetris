export const MINOS = {
  I: [
    [[0,1],[1,1],[2,1],[3,1]],
    [[2,0],[2,1],[2,2],[2,3]],
    [[0,2],[1,2],[2,2],[3,2]],
    [[1,0],[1,1],[1,2],[1,3]]
  ],
  O: [
    [[1,0],[2,0],[1,1],[2,1]],
    [[1,0],[2,0],[1,1],[2,1]],
    [[1,0],[2,0],[1,1],[2,1]],
    [[1,0],[2,0],[1,1],[2,1]]
  ],
  T: [
    [[1,0],[0,1],[1,1],[2,1]],
    [[1,0],[1,1],[2,1],[1,2]],
    [[0,1],[1,1],[2,1],[1,2]],
    [[1,0],[0,1],[1,1],[1,2]]
  ],
  S: [
    [[1,0],[2,0],[0,1],[1,1]],
    [[1,0],[1,1],[2,1],[2,2]],
    [[1,1],[2,1],[0,2],[1,2]],
    [[0,0],[0,1],[1,1],[1,2]]
  ],
  Z: [
    [[0,0],[1,0],[1,1],[2,1]],
    [[2,0],[1,1],[2,1],[1,2]],
    [[0,1],[1,1],[1,2],[2,2]],
    [[1,0],[0,1],[1,1],[0,2]]
  ],
  J: [
    [[0,0],[0,1],[1,1],[2,1]],
    [[1,0],[2,0],[1,1],[1,2]],
    [[0,1],[1,1],[2,1],[2,2]],
    [[1,0],[1,1],[0,2],[1,2]]
  ],
  L: [
    [[2,0],[0,1],[1,1],[2,1]],
    [[1,0],[1,1],[1,2],[2,2]],
    [[0,1],[1,1],[2,1],[0,2]],
    [[0,0],[1,0],[1,1],[1,2]]
  ]
};

const COLORS = {
  I: "#0ff",
  O: "#ff0",
  T: "#f0f",
  S: "#0f0",
  Z: "#f00",
  J: "#00f",
  L: "#fa0"
};

export function createMino() {
  const types = Object.keys(MINOS);
  const type = types[Math.floor(Math.random() * types.length)];
  return {
    type,
    rotation: 0,
    x: 3,
    y: 0,
    blocks: MINOS[type][0],
    color: COLORS[type]
  };
}

export function rotateMino(mino, dir) {
  const rot = dir === "left" ? (mino.rotation + 3) % 4 : (mino.rotation + 1) % 4;
  return {
    ...mino,
    rotation: rot,
    blocks: MINOS[mino.type][rot]
  };
}

export function getBlocks(mino) {
  return mino.blocks.map(([dx, dy]) => [mino.x + dx, mino.y + dy]);
}

export function cloneMino(mino) {
  return {
    type: mino.type,
    rotation: mino.rotation,
    x: mino.x,
    y: mino.y,
    blocks: MINOS[mino.type][mino.rotation], // rotationに対応するblocks
    color: mino.color
  };
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export function getNextBag() {
  const types = Object.keys(MINOS);
  const shuffled = shuffle([...types]);
  return shuffled.map(type => ({
    type,
    rotation: 0,
    x: 3,
    y: 0,
    blocks: MINOS[type][0],
    color: COLORS[type]
  }));
}