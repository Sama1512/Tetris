import { ScoreManager } from "../js/core/score.js";
import { classifyTSpinStrict } from "../js/core/tspin.js";

const elR = document.getElementById("results");
const elL = document.getElementById("log");
const li = (ok,msg)=>{ const n=document.createElement("li"); n.className=ok?"ok":"ng"; n.textContent=(ok?"✔ ":"✖ ")+msg; elR.appendChild(n); };
const log= (...a)=>{ elL.textContent += a.map(x=> typeof x==="string"? x : JSON.stringify(x)).join(" ")+"\n"; };

document.getElementById("run").addEventListener("click", ()=>{
    elR.innerHTML=""; elL.textContent="";

    // --- ScoreManager の期待値検証 ---
    const sm = new ScoreManager();
    const run = (desc, expectMin=null)=>{
    const r = sm.applyClear(desc); log("→", desc, "==>", r, "state", sm.getState());
    if (expectMin != null) li(r.added >= expectMin, `score >= ${expectMin} (got ${r.added})`);
    };
    run({ lines:4, type:"normal",     perfectClear:false }, 800);    // TETRIS
    run({ lines:2, type:"tspin",      perfectClear:false }, 1200);   // TSD
    run({ lines:1, type:"tspin-mini", perfectClear:false }, 200);    // Mini
    run({ lines:1, type:"tspin",      perfectClear:false }, 800);    // TSS
    run({ lines:4, type:"normal",     perfectClear:true  }, 4300);   // TETRIS + AC

    // --- T-Spin 分類の要点だけ ---
    const W=10,H=20, F=()=>Array.from({length:H},()=>Array(W).fill(0));
    const set=(f,x,y)=>{ if (y>=0&&y<H&&x>=0&&x<W) f[y][x]=1; };
    const T=(x,y,r)=>({ type:"T", r, x, y, shape:[[0,1,0],[1,1,1],[0,0,0]] });
    const t = T(4,10,0); const cx=t.x+1, cy=t.y+1;

    let f = F(); set(f,cx-1,cy-1); set(f,cx-1,cy+1); set(f,cx+1,cy+1);
    li(classifyTSpinStrict(t,f,{rotated:true},0)==="tspin-mini","T-Spin Mini (no line)");

    f = F(); set(f,cx-1,cy-1); set(f,cx-1,cy+1); set(f,cx+1,cy+1);
    li(classifyTSpinStrict(t,f,{rotated:true},1)==="tspin-mini","T-Spin Mini Single");

    f = F(); set(f,cx-1,cy-1); set(f,cx+1,cy-1); set(f,cx-1,cy+1);
li(classifyTSpinStrict(t,f,{rotated:true},1)==="tspin","T-Spin Single");
});