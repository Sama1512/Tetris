// キー入力 → アクション（文字列）に変換し、DAS/ARR をサポートする薄いドライバ

let keyBindings = {
  moveLeft:   "ArrowLeft",
  moveRight:  "ArrowRight",
  softDrop:   "ArrowDown",
  hardDrop:   "ArrowUp",
  rotateRight:"KeyX",
  rotateLeft: "KeyZ",
  hold:       "KeyC",
  pause:      "KeyP",
};

// 起動時に keyBindings を localStorage から上書き
try {
  const raw = localStorage.getItem("keyBindings");
  if (raw) keyBindings = { ...keyBindings, ...JSON.parse(raw) };
} catch {}

let handlerDown = null;
let handlerUp   = null;

export function cleanupInput() {
  if (handlerDown) { document.removeEventListener("keydown", handlerDown); handlerDown = null; }
  if (handlerUp)   { document.removeEventListener("keyup",   handlerUp);   handlerUp   = null; }
}

// DAS/ARR リピータ（左右専用）
function makeRepeater(actionName, fire) {
  let pressed = false;
  let dasTimer = null;
  let arrTimer = null;

  const clearTimers = () => {
    if (dasTimer) { clearTimeout(dasTimer); dasTimer = null; }
    if (arrTimer) { clearInterval(arrTimer); arrTimer = null; }
  };

  const down = (dasMs, arrMs) => {
    if (pressed) return;
    pressed = true;
    fire(actionName); // 初回1発

    // DAS 後に連射開始
    dasTimer = setTimeout(() => {
      // ARR=0 は「瞬間扱い」→ 最小 10ms で代替連射
      const interval = (arrMs <= 0) ? 10 : (arrMs|0);
      arrTimer = setInterval(() => fire(actionName), interval);
    }, Math.max(0, dasMs|0));
  };

  const up = () => { pressed = false; clearTimers(); };

  return { down, up, clear: clearTimers, isPressed: ()=>pressed };
}

export function initInput(callback) {
  cleanupInput();

  // 設定から DAS/ARR を読む（なければデフォルト）
  let dasMs = 100, arrMs = 33;
  try {
    const s = JSON.parse(localStorage.getItem("settings") || "{}");
    if (Number.isFinite(s.das)) dasMs = s.das|0;
    if (Number.isFinite(s.arr)) arrMs = s.arr|0;
  } catch {}

  const fire = (action) => { try { callback(action); } catch {} };

  // 左右のオートリピート
  const repLeft  = makeRepeater("moveLeft",  fire);
  const repRight = makeRepeater("moveRight", fire);

  const codeToAction = (code) => {
    for (const [act, key] of Object.entries(keyBindings)) {
      if (key === code) return act;
    }
    return null;
  };

  handlerDown = (e) => {
    const act = codeToAction(e.code);
    if (!act) return;
    if (["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Space"].includes(e.code)) e.preventDefault();

    switch (act) {
      case "moveLeft":  repLeft.down(dasMs, arrMs);  break;
      case "moveRight": repRight.down(dasMs, arrMs); break;
      default: fire(act); break; // 回転/ホールド/ハード/ソフトは1発
    }
  };

  handlerUp = (e) => {
    const act = codeToAction(e.code);
    if (!act) return;
    if (["ArrowLeft","ArrowRight"].includes(e.code)) {
      if (act === "moveLeft")  repLeft.up();
      if (act === "moveRight") repRight.up();
    }
  };

  document.addEventListener("keydown", handlerDown);
  document.addEventListener("keyup",   handlerUp);
}

// 互換：コントロール再設定のためのダミー(CPU用)
export function setupControls() {}