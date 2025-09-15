// 7-Bag / SRS回転（JLSTZ と I で別キック）/ 互換 getBlocks

export const MINOS = {
  I: { type: "I", color: "#00FFFF", shapes: [
    [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
    [[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]],
    [[0,0,0,0],[0,0,0,0],[1,1,1,1],[0,0,0,0]],
    [[0,1,0,0],[0,1,0,0],[0,1,0,0],[0,1,0,0]],
  ], kick: "I" },
  O: { type: "O", color: "#FFFF00", shapes: [
    [[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
    [[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
    [[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
    [[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
  ], kick: "O" },
  T: { type: "T", color: "#AA00FF", shapes: [
    [[0,1,0],[1,1,1],[0,0,0]],
    [[0,1,0],[0,1,1],[0,1,0]],
    [[0,0,0],[1,1,1],[0,1,0]],
    [[0,1,0],[1,1,0],[0,1,0]],
  ], kick: "JLSTZ" },
  S: { type: "S", color: "#00FF00", shapes: [
    [[0,1,1],[1,1,0],[0,0,0]],
    [[0,1,0],[0,1,1],[0,0,1]],
    [[0,0,0],[0,1,1],[1,1,0]],
    [[1,0,0],[1,1,0],[0,1,0]],
  ], kick: "JLSTZ" },
  Z: { type: "Z", color: "#FF0000", shapes: [
    [[1,1,0],[0,1,1],[0,0,0]],
    [[0,0,1],[0,1,1],[0,1,0]],
    [[0,0,0],[1,1,0],[0,1,1]],
    [[0,1,0],[1,1,0],[1,0,0]],
  ], kick: "JLSTZ" },
  J: { type: "J", color: "#0000FF", shapes: [
    [[1,0,0],[1,1,1],[0,0,0]],
    [[0,1,1],[0,1,0],[0,1,0]],
    [[0,0,0],[1,1,1],[0,0,1]],
    [[0,1,0],[0,1,0],[1,1,0]],
  ], kick: "JLSTZ" },
  L: { type: "L", color: "#FFA500", shapes: [
    [[0,0,1],[1,1,1],[0,0,0]],
    [[0,1,0],[0,1,0],[0,1,1]],
    [[0,0,0],[1,1,1],[1,0,0]],
    [[1,1,0],[0,1,0],[0,1,0]],
  ], kick: "JLSTZ" },
};

export function cloneMino(mino){ return JSON.parse(JSON.stringify(mino)); }

export function getNextBag(){
  const types=["I","O","T","S","Z","J","L"];
  const bag=[...types];
  for(let i=bag.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [bag[i],bag[j]]=[bag[j],bag[i]];
  }
  return bag.map(t=>({ type:t, r:0, x:3, y:0, shape: MINOS[t].shapes[0] }));
}

// --- SRS キック表（Guideline） ---
const KICKS_JLSTZ={
  "0>1":[[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
  "1>0":[[0,0],[1,0],[1,-1],[0,2],[1,2]],
  "1>2":[[0,0],[1,0],[1,-1],[0,2],[1,2]],
  "2>1":[[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
  "2>3":[[0,0],[1,0],[1,1],[0,-2],[1,-2]],
  "3>2":[[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
  "3>0":[[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
  "0>3":[[0,0],[1,0],[1,1],[0,-2],[1,-2]],
};
const KICKS_I={
  "0>1":[[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
  "1>0":[[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
  "1>2":[[0,0],[-1,0],[2,0],[-1,2],[2,-1]],
  "2>1":[[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
  "2>3":[[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
  "3>2":[[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
  "3>0":[[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
  "0>3":[[0,0],[-1,0],[2,0],[-1,2],[2,-1]],
};

// 壁蹴り込み回転
export function rotateMino(mino, dir, field, checkCollision){
  const src=cloneMino(mino);
  const def=MINOS[src.type];
  const to=(src.r+(dir==="right"?1:3))%4;
  const shape=def.shapes[to];

  if(src.type==="O"){
    return { mino:{...src,r:to,shape}, kicked:false, kickIndex:0 };
  }

  const key=`${src.r}>${to}`;
  const kicks=(def.kick==="I"?KICKS_I:KICKS_JLSTZ)[key]||[[0,0]];
  for(let i=0;i<kicks.length;i++){
    const [dx,dy]=kicks[i];
    const cand={...src,r:to,shape,x:src.x+dx,y:src.y+dy};
    if(!checkCollision(field,cand)){
      return { mino:cand, kicked:i!==0, kickIndex:i };
    }
  }
  return { mino:src, kicked:false, kickIndex:-1 };
}

export function isTPiece(mino){ return mino?.type==="T"; }
export function getCenterOfT(mino){ return { cx: mino.x+1, cy: mino.y+1 }; }

/** 描画用ブロック座標を返す（配列兼{x,y}で両対応） */
export function getBlocks(mino, { absolute = true } = {}){
  if (!mino || !mino.shape || !mino.shape[0]) return [];
  const s = mino.shape;
  const out = [];
  for (let y = 0; y < s.length; y++) {
    for (let x = 0; x < s[0].length; x++) {
      if (!s[y][x]) continue;
      const ax = absolute ? (mino.x + x) : x;
      const ay = absolute ? (mino.y + y) : y;
      const pt = [ax, ay];
      pt.x = ax; pt.y = ay;
      out.push(pt);
    }
  }
  return out;
}