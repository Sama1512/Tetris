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

// --- SRS wall kicks (Guideline) ---
const KICKS_JLSTZ = {
  "0>1": [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
  "1>0": [[0,0],[1,0],[1,-1],[0,2],[1,2]],
  "1>2": [[0,0],[1,0],[1,-1],[0,2],[1,2]],
  "2>1": [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
  "2>3": [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
  "3>2": [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
  "3>0": [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
  "0>3": [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
};

const KICKS_I = {
  "0>1": [[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
  "1>0": [[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
  "1>2": [[0,0],[-1,0],[2,0],[-1,2],[2,-1]],
  "2>1": [[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
  "2>3": [[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
  "3>2": [[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
  "3>0": [[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
  "0>3": [[0,0],[-1,0],[2,0],[-1,2],[2,-1]],
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

export function rotateMino(mino, dir, field, checkCollision) {
  // 2-arg fallback: no collision / no kicks (keep backward compatibility)
  const simple = () => {
    const rot = dir === "left" ? (mino.rotation + 3) % 4 : (mino.rotation + 1) % 4;
    return { ...mino, rotation: rot, blocks: MINOS[mino.type][rot] };
  };

  // If no field or no checker, return plain rotated mino (legacy behavior)
  if (!field || typeof checkCollision !== "function") {
    return simple();
  }

  const from = mino.rotation|0;
  const to   = dir === "left" ? (from + 3) % 4 : (from + 1) % 4;
  const shape = MINOS[mino.type][to];

  // O piece: no kicks, just rotate at same origin
  if (mino.type === "O") {
    const cand = { ...mino, rotation: to, blocks: shape };
    const collides = checkCollision(field, cand);
    if (!collides) {
      return { mino: cand, kicked: false, kickIndex: 0 };
    } else {
      // cannot rotate -> return legacy rotated anyway (or stay? choose stay)
      return { mino: mino, kicked: false, kickIndex: -1 };
    }
  }

  const key = `${from}>${to}`;
  const table = (mino.type === "I" ? KICKS_I : KICKS_JLSTZ)[key] || [[0,0]];

  for (let i = 0; i < table.length; i++) {
    const [dx, dy] = table[i];
    const cand = {
      ...mino,
      x: mino.x + dx,
      y: mino.y + dy,
      rotation: to,
      blocks: shape,
    };
    if (!checkCollision(field, cand)) {
      return { mino: cand, kicked: i !== 0, kickIndex: i };
    }
  }

  // All failed: stay as is
  return { mino, kicked: false, kickIndex: -1 };
};

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