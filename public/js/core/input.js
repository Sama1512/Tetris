// キー入力 → アクション変換

let currentHandler = null;
let bindings = {
  moveLeft:   "ArrowLeft",
  moveRight:  "ArrowRight",
  softDrop:   "ArrowDown",
  hardDrop:   "ArrowUp",
  rotateRight:"KeyX",
  rotateLeft: "KeyZ",
  hold:       "KeyC",
  pause:      "KeyP",
};

export function initInput(callback) {
  cleanupInput();
  currentHandler = (e) => {
    const action = keyToAction(e.code);
    if (!action) return;
    e.preventDefault();
    try { callback(action); } catch {}
  };
  document.addEventListener("keydown", currentHandler);
}

export function cleanupInput() {
  if (currentHandler) {
    document.removeEventListener("keydown", currentHandler);
    currentHandler = null;
  }
}

export function getCurrentKeyBindings() { return { ...bindings }; }
export function setKeyBindings(next) { bindings = { ...bindings, ...next }; }

function keyToAction(code) {
  for (const [act, key] of Object.entries(bindings)) {
    if (key === code) return act;
  }
  return null;
}