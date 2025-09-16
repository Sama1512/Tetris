// キー → アクション変換対応
let currentHandler = null;
let keyMap = {};

// デフォルトキー設定（保存されていない場合に使用）
const defaultBindings = {
  moveLeft: "ArrowLeft",
  moveRight: "ArrowRight",
  softDrop: "ArrowDown",
  hardDrop: "ArrowUp",
  rotateRight: "KeyX",
  rotateLeft: "KeyZ",
  hold: "KeyC",
  pause: "KeyP"
};

export function loadKeyBindings() {
  const saved = localStorage.getItem("keyBindings");
  const bindings = saved ? JSON.parse(saved) : defaultBindings;

  // 初回起動やローカルストレージがクリアされていた場合に保存しておく
  if (!saved) {
    localStorage.setItem("keyBindings", JSON.stringify(defaultBindings));
  }

  keyMap = Object.fromEntries(
    Object.entries(bindings).map(([action, key]) => [key, action])
  );
}

export function initInput(callback) {
  cleanupInput();
  loadKeyBindings();
  currentHandler = (event) => {
    const action = keyMap[event.code];
    if (action) {
      callback(action);
    }
  };
  document.addEventListener("keydown", currentHandler);
}

export function cleanupInput() {
  if (currentHandler) {
    document.removeEventListener("keydown", currentHandler);
    currentHandler = null;
  }
}

// AI用に何もしないsetupControls（あればエラー回避）
export function setupControls() {}