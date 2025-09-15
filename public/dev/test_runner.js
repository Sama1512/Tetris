// dev/test_runner.js
import * as Field from "../js/core/field.js";
import * as Mino from "../js/core/mino.js";
import { classifyTSpinStrict } from "../js/core/tspin.js";
import { ScoreManager } from "../js/core/score.js";

const elResults = document.getElementById("results");
const elLog = document.getElementById("log");
document.getElementById("run").addEventListener("click", runAll);

function log(...args){ elLog.textContent += args.map(a => typeof a==='string'? a : JSON.stringify(a)).join(' ') + "\n"; }
function li(ok, msg){ const li=document.createElement('li'); li.className=ok?'ok':'ng'; li.textContent=(ok?'✔ ':'✖ ')+msg; elResults.appendChild(li); }

function makeEmpty(){ return Field.createEmptyField(); }

function setCell(field, x, y, v=1){
  if (y>=0&&y<field.length&&x>=0&&x<field[0].length){ field[y][x]=v; }
}

function clone(obj){ return JSON.parse(JSON.stringify(obj)); }

async function runAll(){
  elResults.innerHTML=''; elLog.textContent='';
  try{
    testTSpinMiniNoLine();
    testTSpinMiniSingle();
    testTSpinSingle();
    testTSpinDouble();
    testB2B();
    testREN();
    testPerfectClear();
    testWallKickJLSTZ();
    testWallKickI();
    li(true, "全テスト実行完了");
  }catch(e){
    console.error(e);
    li(false, "テスト中に例外: " + e.message);
    log(e.stack || e);
  }
}

function craftTAt(x,y,r=0){
  const mino={ type:"T", r, x, y, shape: Mino.MINOS.T.shapes[r] };
  return mino;
}

// --- Tests ---

function testTSpinMiniNoLine(){
  const f = makeEmpty();
  const t = craftTAt(4,10,0);
  const {cx,cy} = Mino.getCenterOfT(t);
  // corners: TL,TR,BL,BR -> fill 3 corners (front TR empty to keep frontFilled<2)
  setCell(f, cx-1, cy-1, 1);
  // TR left empty
  setCell(f, cx-1, cy+1, 1);
  setCell(f, cx+1, cy+1, 1);
  const kind = classifyTSpinStrict(t, f, {rotated:true,kicked:false}, 0);
  li(kind==="tspin-mini", `T-Spin Mini (no line): ${kind}`);
  log("[Mini NoLine] kind=", kind);
}

function testTSpinMiniSingle(){
  const f = makeEmpty();
  const t = craftTAt(4,10,0);
  const {cx,cy} = Mino.getCenterOfT(t);
  // corners >=3, but frontFilled != 2
  setCell(f, cx-1, cy-1, 1); // TL
  // TR empty
  setCell(f, cx-1, cy+1, 1); // BL
  setCell(f, cx+1, cy+1, 1); // BR
  const kind = classifyTSpinStrict(t, f, {rotated:true,kicked:false}, 1);
  li(kind==="tspin-mini", `T-Spin Mini Single: ${kind}`);
  log("[Mini Single] kind=", kind);
}

function testTSpinSingle(){
  const f = makeEmpty();
  const t = craftTAt(4,10,0);
  const {cx,cy} = Mino.getCenterOfT(t);
  // corners >=3, frontFilled == 2
  setCell(f, cx-1, cy-1, 1); // TL
  setCell(f, cx+1, cy-1, 1); // TR (front)
  setCell(f, cx-1, cy+1, 1); // BL
  // BR can be empty; already 3 corners filled
  const kind = classifyTSpinStrict(t, f, {rotated:true,kicked:false}, 1);
  li(kind==="tspin", `T-Spin Single: ${kind}`);
  log("[T-Spin Single] kind=", kind);
}

function testTSpinDouble(){
  const f = makeEmpty();
  const t = craftTAt(4,10,2); // r=2 (down) でもOK
  const {cx,cy} = Mino.getCenterOfT(t);
  // corners >=3
  setCell(f, cx-1, cy-1, 1);
  setCell(f, cx+1, cy-1, 1);
  setCell(f, cx-1, cy+1, 1);
  const kind = classifyTSpinStrict(t, f, {rotated:true,kicked:true}, 2);
  li(kind==="tspin", `T-Spin Double: ${kind}`);
  log("[T-Spin Double] kind=", kind);
}

function testB2B(){
  const sm = new ScoreManager();
  let r1 = sm.applyClear({lines:4, type:"normal", perfectClear:false}); // TETRIS
  let r2 = sm.applyClear({lines:2, type:"tspin", perfectClear:false}); // B2B対象
  const ok = r2.b2b>=2; // 連続で対象手 → B2B継続
  li(ok, `B2B 継続: b2b=${r2.b2b}`);
  log("[B2B]", {r1, r2});
}

function testREN(){
  const sm = new ScoreManager();
  let r1 = sm.applyClear({lines:1, type:"normal", perfectClear:false}); // REN=0
  let r2 = sm.applyClear({lines:1, type:"normal", perfectClear:false}); // REN=1
  let r3 = sm.applyClear({lines:0, type:"normal", perfectClear:false}); // break
  const ok = (r1.combo===0) && (r2.combo===1) && (sm.combo===-1);
  li(ok, `REN 加算/リセット: r1.combo=${r1.combo}, r2.combo=${r2.combo}, afterBreak=${sm.combo}`);
  log("[REN]", {r1, r2, r3});
}

function testPerfectClear(){
  const f = makeEmpty();
  // 最下段を埋める → 1ライン消去で盤面空
  for(let x=0;x<10;x++){ setCell(f, x, 19, 1); }
  const lines = Field.clearLines(f);
  const pc = Field.isPerfectClear(f);
  const ok = (lines===1 && pc===true);
  li(ok, `Perfect Clear 検出: lines=${lines}, pc=${pc}`);
  log("[PC]", {lines, pc});
}

function testWallKickJLSTZ(){
  const f = Field.createEmptyField();
  // 右壁付近に寄せる（10列盤でx=8に3幅の駒を置くと、[0,0] 回転がはみ出す）
  const mino = { type:"J", r:0, x:8, y:10, shape: Mino.MINOS.J.shapes[0] };
  const rr = Mino.rotateMino(mino, "right", f, Field.checkCollision);
  const usedKick = rr.kicked === true || (rr.kickIndex != null && rr.kickIndex > 0);
  li(usedKick, `SRS 壁蹴り (JLSTZ) 実行: kicked=${rr.kicked}, index=${rr.kickIndex}, pos=(${rr.mino.x},${rr.mino.y}), r=${rr.mino.r}`);
  log("[Kick JLSTZ]", rr);
}

function testWallKickI(){
  const f = Field.createEmptyField();
  // Iを右壁付近に配置（10列幅の盤で x=8 にすると 0>1 回転の [0,0] はみ出し → キック必須）
  const mino = { type:"I", r:0, x:8, y:10, shape: Mino.MINOS.I.shapes[0] };

  const rr = Mino.rotateMino(mino, "right", f, Field.checkCollision);

  // 実際にキックが使われたか（kickIndex>0 でもOK）
  const usedKick = rr.kicked === true || (rr.kickIndex != null && rr.kickIndex > 0);

  // 期待：usedKick が true になる（pos が左に寄っているはず）
  li(usedKick, `SRS 壁蹴り (I) 実行: kicked=${rr.kicked}, index=${rr.kickIndex}, pos=(${rr.mino.x},${rr.mino.y}), r=${rr.mino.r}`);
  log("[Kick I]", rr);
}
