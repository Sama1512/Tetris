// 依存を最小化：MINOSに頼らず、Tの3x3形状はこのファイルに内蔵。
// classifyTSpinStrict は ../js/core/tspin.js から読み込み、404時は同等実装にフォールバック。

const T_SHAPES = [
    // r=0 (up)
    [
        [0,1,0],
        [1,1,1],
        [0,0,0],
    ],
    // r=1 (right)
    [
        [0,1,0],
        [0,1,1],
        [0,1,0],
    ],
    // r=2 (down)
    [
        [0,0,0],
        [1,1,1],
        [0,1,0],
    ],
    // r=3 (left)
    [
        [0,1,0],
        [1,1,0],
        [0,1,0],
    ],
];

function tAt(x, y, r=0){
    r = ((r|0) % 4 + 4) % 4;
    return { type:"T", r, x, y, shape: T_SHAPES[r] };
}

function field(w=10,h=20){ return Array.from({length:h},()=>Array(w).fill(0)); }
function set(f,x,y,v=1){ if(y>=0&&y<f.length&&x>=0&&x<f[0].length){ f[y][x]=v; } }
function corners(cx,cy){ return [[cx-1,cy-1],[cx+1,cy-1],[cx-1,cy+1],[cx+1,cy+1]]; }
function fronts(r,cx,cy){
    if(r===0) return [[cx-1,cy-1],[cx+1,cy-1]];
    if(r===1) return [[cx+1,cy-1],[cx+1,cy+1]];
    if(r===2) return [[cx-1,cy+1],[cx+1,cy+1]];
    return [[cx-1,cy-1],[cx-1,cy+1]];
}

// ------ classifyTSpinStrict を読み込み（失敗時はフォールバック） ------
let classifyTSpinStrict;
try {
    ({ classifyTSpinStrict } = await import("../js/core/tspin.js"));
} catch (e) {
    console.warn("[tspin_check] ../js/core/tspin.js を読み込めませんでした。フォールバック実装を使用します。", e);
    classifyTSpinStrict = (mino, fieldBeforeClear, lastSpin, lines) => {
        if (!lastSpin?.rotated || mino?.type !== "T") return "normal";
        const W = fieldBeforeClear?.[0]?.length ?? 10;
        const H = fieldBeforeClear?.length ?? 20;
        const cx = (mino?.x ?? 0) + 1, cy = (mino?.y ?? 0) + 1;

        const allCorners = corners(cx,cy);
        let cornersFilled = 0;
        for (const [x,y] of allCorners) {
        if (x<0||x>=W||y<0||y>=H) { cornersFilled++; continue; }
        if (fieldBeforeClear[y][x]) cornersFilled++;
        }
        if (cornersFilled < 3) return "normal";

        const fs = fronts((mino?.r ?? 0)%4, cx, cy);
        let frontFilled = 0;
        for (const [x,y] of fs) {
        if (x<0||x>=W||y<0||y>=H) { frontFilled++; continue; }
        if (fieldBeforeClear[y][x]) frontFilled++;
        }
        if (lines === 0) return "tspin-mini";
        if (lines === 1) return (frontFilled === 2) ? "tspin" : "tspin-mini";
        return "tspin";
    };
}

// ------ 画面まわり ------
const elR = document.getElementById("results");
const elL = document.getElementById("log");
const log = (...a)=>{ elL.textContent += a.map(x=> typeof x==="string"? x : JSON.stringify(x)).join(" ") + "\n"; };
const li  = (ok,msg)=>{ const li=document.createElement("li"); li.className=ok?"ok":"ng"; li.textContent=(ok?"✔ ":"✖ ")+msg; elR.appendChild(li); };

document.getElementById("run").addEventListener("click", () => {
    elR.innerHTML=""; elL.textContent="";

    // 1) Mini（ノーライン）: 角3/4埋め・front=1 以下
    {
        const f = field(); const t = tAt(4,10,0);
        const cx=t.x+1, cy=t.y+1;
        const [tl,tr,bl,br] = corners(cx,cy);
        set(f, ...tl, 1); set(f, ...bl, 1); set(f, ...br, 1); // TRを空ける → frontFilled=1
        const kind = classifyTSpinStrict(t, f, {rotated:true}, 0);
        li(kind==="tspin-mini", `T-Spin Mini (no line): ${kind}`); log("[Mini0]", kind);
    }

    // 2) Mini（シングル）: 角3/4埋め・front=1 以下
    {
        const f = field(); const t = tAt(4,10,0);
        const cx=t.x+1, cy=t.y+1;
        const [tl,tr,bl,br] = corners(cx,cy);
        set(f, ...tl, 1); set(f, ...bl, 1); set(f, ...br, 1); // TR空き
        const kind = classifyTSpinStrict(t, f, {rotated:true}, 1);
        li(kind==="tspin-mini", `T-Spin Mini Single: ${kind}`); log("[Mini1]", kind);
    }

    // 3) T-Spin Single: 角3/4埋め & front=2
    {
        const f = field(); const t = tAt(4,10,0);
        const cx=t.x+1, cy=t.y+1;
        const [tl,tr,bl,br] = corners(cx,cy);
        set(f, ...tl, 1); set(f, ...tr, 1); set(f, ...bl, 1); // frontFilled=2
        const kind = classifyTSpinStrict(t, f, {rotated:true}, 1);
        li(kind==="tspin", `T-Spin Single: ${kind}`); log("[TSS]", kind);
    }

    // 4) T-Spin Double: lines=2 なら tspin
    {
        const f = field(); const t = tAt(4,10,2);
        const cx=t.x+1, cy=t.y+1;
        const [tl,tr,bl,br] = corners(cx,cy);
        set(f, ...tl, 1); set(f, ...tr, 1); set(f, ...bl, 1);
        const kind = classifyTSpinStrict(t, f, {rotated:true}, 2);
        li(kind==="tspin", `T-Spin Double: ${kind}`); log("[TSD]", kind);
    }

});