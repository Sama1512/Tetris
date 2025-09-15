import { getCurrentKeyBindings } from "../core/input.js";

export function updateUI(state, elapsedMs = null) {
  const s = state?.score ?? state?.scoreState ?? state ?? {};
  setText("score", s.score ?? 0);
  setText("level", s.level ?? 1);
  setText("lines", s.lines ?? 0);

  if (elapsedMs != null) {
    const mm = Math.floor(elapsedMs/60000);
    const ss = Math.floor((elapsedMs%60000)/1000);
    const cs = Math.floor((elapsedMs%1000)/10);
    setText("time", `${mm.toString().padStart(2,"0")}:${ss.toString().padStart(2,"0")}.${cs.toString().padStart(2,"0")}`);
  }

  updateControlGuide();
}

export function updateControlGuide() {
  const b = getCurrentKeyBindings?.() ?? null;
  if (!b) return;
  const map = {
    moveLeft:"left-key", moveRight:"right-key", softDrop:"down-key", hardDrop:"up-key",
    rotateLeft:"z-key", rotateRight:"x-key", hold:"c-key", pause:"p-key"
  };
  for (const [act, id] of Object.entries(map)) {
    const el = document.getElementById(id);
    if (el && b[act]) el.textContent = prettyKey(b[act]);
  }
}

function prettyKey(code) {
  if (code.startsWith("Arrow")) return {ArrowLeft:"←",ArrowRight:"→",ArrowUp:"↑",ArrowDown:"↓"}[code] ?? code;
  return code.replace(/^Key/,"").toUpperCase();
}
function setText(id, text){ const el=document.getElementById(id); if(el) el.textContent=String(text); }