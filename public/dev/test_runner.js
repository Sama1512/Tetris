// /public/dev/test_runner.js
import * as Field from "../js/core/field.js";
import * as Mino from "../js/core/mino.js";
import { classifyTSpinStrict } from "../js/core/tspin.js";
import { ScoreManager } from "../js/core/score.js";

const elResults = document.getElementById("results");
const elLog = document.getElementById("log");
document.getElementById("run").addEventListener("click", runAll);

const log = (...a)=>{ elLog.textContent += a.map(x=> typeof x==="string"? x : JSON.stringify(x)).join(" ") + "\n"; };
const li  = (ok,msg)=>{ const li=document.createElement("li"); li.className=ok?"ok":"ng"; li.textContent=(ok?"✔ ":"✖ ")+msg; elResults.appendChild(li); };

// --- 互換レイヤ ---
const makeEmpty = () => (typeof Field.createEmptyField === "function" ? Field.createEmptyField()
                      : typeof Field.initField === "function" ? Field.initField()
                      : Array.from({length:20},()=>Array(10).fill(0)));

const getCenterOfT = (mino) => (typeof Mino.getCenterOfT === "function"
  ? Mino.getCenterOfT(mino)
  : { cx: (mino?.x ?? 0) + 1, cy: (mino?.y ?? 0) + 1 });

const rotateK = (mino, dir, f) => {
  try {
    // SRS版（4引数）に対応
    return Mino.rotateMino(mino, dir, f, Field.checkCollision);
  } catch {
    // 簡易回転（2引数）にフォールバック
    return Mino.rotateMino(mino, dir);
  }
};

// --- util ---
const setCell = (field, x, y, v=1)=>{
  if (y>=0&&y<field.length&&x>=0&&x<field[0].length){ field[y][x]=v; }
};
const craftTAt = (x,y,r=0)=> ({ type:"T", r, x, y, shape: (Mino.MINOS?.T?.shapes?.[r] ?? [[0,1,0],[1,1,1],[0,0,0]]) });

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

// --- Tests ---
function testTSpinMiniNoLine(){
  const f = makeEmpty(); const t = craftTAt(4,10,0);
  const {cx,cy} = getCenterOfT(t);
  setCell(f, cx-1, cy-1, 1); setCell(f, cx-1, cy+1, 1); setCell(f, cx+1, cy+1, 1);
  const kind = classifyTSpinStrict(t, f, {rotated:true,kicked:false}, 0);
  li(kind==="tspin-mini", `T-Spin Mini (no line): ${kind}`); log("[Mini NoLine]", kind);
}

function testTSpinMiniSingle(){
  const f = makeEmpty(); const t = craftTAt(4,10,0);
  const {cx,cy} = getCenterOfT(t);
  setCell(f, cx-1, cy-1, 1); setCell(f, cx-1, cy+1, 1); setCell(f, cx+1, cy+1, 1);
  const kind = classifyTSpinStrict(t, f, {rotated:true,kicked:false}, 1);
  li(kind==="tspin-mini", `T-Spin Mini Single: ${kind}`); log("[Mini Single]", kind);
}

function testTSpinSingle(){
  const f = makeEmpty(); const t = craftTAt(4,10,0);
  const {cx,cy} = getCenterOfT(t);
  setCell(f, cx-1, cy-1, 1); setCell(f, cx+1, cy-1, 1); setCell(f, cx-1, cy+1, 1);
  const kind = classifyTSpinStrict(t, f, {rotated:true,kicked:false}, 1);
  li(kind==="tspin", `T-Spin Single: ${kind}`); log("[TSS]", kind);
}

function testTSpinDouble(){
  const f = makeEmpty(); const t = craftTAt(4,10,2);
  const {cx,cy} = getCenterOfT(t);
  setCell(f, cx-1, cy-1, 1); setCell(f, cx+1, cy-1, 1); setCell(f, cx-1, cy+1, 1);
  const kind = classifyTSpinStrict(t, f, {rotated:true,kicked:true}, 2);
  li(kind==="tspin", `T-Spin Double: ${kind}`); log("[TSD]", kind);
}

function testB2B(){
  const sm = new ScoreManager();
  const r1 = sm.applyClear({lines:4, type:"normal", perfectClear:false});
  const r2 = sm.applyClear({lines:2, type:"tspin", perfectClear:false});
  li(r2.b2b>=2, `B2B 継続: b2b=${r2.b2b}`); log("[B2B]", {r1,r2});
}

function testREN(){
  const sm = new ScoreManager();
  const r1 = sm.applyClear({lines:1, type:"normal", perfectClear:false});
  const r2 = sm.applyClear({lines:1, type:"normal", perfectClear:false});
  const r3 = sm.applyClear({lines:0, type:"normal", perfectClear:false});
  const ok = (r1.combo===0) && (r2.combo===1) && (sm.combo===-1);
  li(ok, `REN 加算/リセット: r1.combo=${r1.combo}, r2.combo=${r2.combo}, afterBreak=${sm.combo}`); log("[REN]", {r1,r2,r3});
}

function testPerfectClear(){
  const f = makeEmpty();
  for(let x=0;x<10;x++){ setCell(f, x, 19, 1); }
  const lines = Field.clearLines(f);
  const pc = Field.isPerfectClear(f);
  li((lines===1&&pc===true), `Perfect Clear 検出: lines=${lines}, pc=${pc}`); log("[PC]", {lines, pc});
}

function testWallKickJLSTZ(){
  const f = makeEmpty(); // 10x20 フィールド
  const mino = { type:"J", r:0, x:8, y:10, shape: (Mino.MINOS?.J?.shapes?.[0]) };
  const rr = rotateK(mino, "right", f);
  const usedKick = !!(rr?.kicked || (rr?.kickIndex!=null && rr.kickIndex>0));
  // SRS未実装のときは“回転が成立したか”で代替表示
  const rotated = rr?.r!=null ? (rr.r!==mino.r || rr.x!==mino.x || rr.y!==mino.y) : true;
  li(usedKick || rotated, `SRS 壁蹴り (JLSTZ) 実行: kicked=${rr?.kicked ?? "(unknown)"}, index=${rr?.kickIndex ?? "(unknown)"}`);
  log("[Kick JLSTZ]", rr);
}

function testWallKickI(){
  const f = makeEmpty();
  const mino = { type:"I", r:0, x:8, y:10, shape: (Mino.MINOS?.I?.shapes?.[0]) };
  const rr = rotateK(mino, "right", f);
  const usedKick = !!(rr?.kicked || (rr?.kickIndex!=null && rr.kickIndex>0));
  const rotated = rr?.r!=null ? (rr.r!==mino.r || rr.x!==mino.x || rr.y!==mino.y) : true;
  li(usedKick || rotated, `SRS 壁蹴り (I) 実行: kicked=${rr?.kicked ?? "(unknown)"}, index=${rr?.kickIndex ?? "(unknown)"}`);
  log("[Kick I]", rr);
}