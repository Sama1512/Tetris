export function updateUI(state, elapsedTime = null) {
  const scoreState = state.scoreState || state; // 単独 or 統合状態どちらでも対応

  document.getElementById("score").textContent = scoreState.score || 0;
  document.getElementById("level").textContent = scoreState.level || 1;
  document.getElementById("lines").textContent = scoreState.lines || 0;

  if (elapsedTime !== null) {
    const seconds = Math.floor(elapsedTime / 1000);
    const centiseconds = Math.floor((elapsedTime % 1000) / 10);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    const formatted = `${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}.${centiseconds.toString().padStart(2, "0")}`;

    const timeEl = document.getElementById("clear-time");
    if (timeEl) {
      timeEl.textContent = `${formatted}`;
    }
  }

  updateControlGuide();
}

export function updateControlGuide() {
  const bindings = getCurrentKeyBindings();
  if (!bindings) return;

  for (const action in bindings) {
    const id = `${camelToKebab(action)}-key`;
    const element = document.getElementById(id);
    if (element) {
      element.textContent = keyToSymbol(bindings[action]);
    }
  }
}

// keys.jsonのキー名をHTMLのidに直接変換する処理(例：moveLeft→move-left)
function camelToKebab(str) {
  return str.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase());
}

function getCurrentKeyBindings() {
  try {
    const raw = localStorage.getItem("keyBindings");
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error("キー設定の読み込み失敗:", e);
    return null;
  }
}

function keyToSymbol(code) {
  const map = {
    ArrowLeft: "←",
    ArrowRight: "→",
    ArrowDown: "↓",
    ArrowUp: "↑",
    Space: "␣",
    Enter: "⏎",
    Escape: "Esc",
  };

  if (map[code]) return map[code];
  if (code.startsWith("Key")) return code.slice(3);   // KeyZ → Z
  if (code.startsWith("Digit")) return code.slice(5); // Digit1 → 1
  return code; // fallback
}

//ゲームオーバー時、Canvas上に「GAME OVER」と表示する(marathon.jsで使っていたが、使わないかも)
/*
export function showGameOver() {
  const canvas = document.getElementById("game-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "white";
  ctx.font = "bold 32px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2);
}
*/