// ResizeObserver撤去版：inset:0で親にフィット、再レイアウト連鎖を遮断
export class Effects {
  constructor(canvas) {
    this.canvas = canvas;

    if (!document.getElementById("effects-style")) {
      const style = document.createElement("style");
      style.id = "effects-style";
      style.textContent = `
        @keyframes popFade {
          0%   { transform: scale(0.9); opacity: 0; filter: blur(2px); }
          10%  { transform: scale(1.05); opacity: 1; filter: blur(0); }
          70%  { opacity: 1; }
          100% { transform: scale(1.05) translateY(-10px); opacity: 0; }
        }
        .fx-primary {
          font-family: system-ui, -apple-system, Segoe UI, Roboto, "Noto Sans JP", sans-serif;
          font-weight: 900;
          text-align: center;
          line-height: 1.1;
          padding: 8px 14px;
          border-radius: 16px;
          background: rgba(0,0,0,0.45);
          color: white;
          text-shadow: 0 2px 8px rgba(0,0,0,0.6);
          animation: popFade 900ms ease forwards;
          max-width: 90%;
        }
        .fx-primary .big { font-size: clamp(20px, 5.2vw, 42px); letter-spacing: 0.08em; }
        .fx-primary .mid { font-size: clamp(14px, 3.2vw, 22px); opacity: 0.9; }
        .fx-badge {
          position: absolute;
          right: 8px;
          bottom: 8px;
          font-family: system-ui, -apple-system, Segoe UI, Roboto, "Noto Sans JP", sans-serif;
          font-weight: 700;
          padding: 6px 10px;
          border-radius: 12px;
          background: rgba(0,0,0,0.5);
          color: #fff;
          font-size: 14px;
          text-shadow: 0 1px 4px rgba(0,0,0,0.4);
          animation: popFade 1200ms ease forwards;
        }
      `;
      document.head.appendChild(style);
    }

    const parent = this.canvas.parentElement || document.body;
    if (getComputedStyle(parent).position === "static") {
      parent.style.position = "relative";
    }

    this.container = document.createElement("div");
    this.container.id = "effects-layer";
    Object.assign(this.container.style, {
      position: "absolute",
      inset: "0",
      pointerEvents: "none",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    });
    parent.appendChild(this.container);
  }

  destroy() { this.container?.remove(); }

  _spawnPrimary(title, subtitle=null) {
    const box = document.createElement("div");
    box.className = "fx-primary";
    const big = document.createElement("div");
    big.className = "big";
    big.textContent = title;
    box.appendChild(big);
    if (subtitle) {
      const mid = document.createElement("div");
      mid.className = "mid";
      mid.textContent = subtitle;
      box.appendChild(mid);
    }
    this.container.appendChild(box);
    setTimeout(() => box.remove(), 1100);
  }

  _spawnBadge(text) {
    const b = document.createElement("div");
    b.className = "fx-badge";
    b.textContent = text;
    this.container.appendChild(b);
    setTimeout(() => b.remove(), 1400);
  }

  onClear({ lines, type, b2b, combo, perfectClear }) {
    const isMini = (type === "tspin-mini");
    const isTSpin = (type === "tspin" || isMini);
    let title = "", subtitle = "";

    if (perfectClear) {
      title = "ALL CLEAR";
      subtitle = (lines === 4 ? "TETRIS" : (isTSpin ? "T-SPIN" : `${lines} LINE${lines>1?'S':''}`));
      this._spawnPrimary(title, subtitle);
      if (b2b > 1 && (lines === 4 || isTSpin)) this._spawnBadge(`B2B ×${b2b}`);
      if (combo > 0) this._spawnBadge(`REN ${combo}`);
      return;
    }

    if (isTSpin) {
      title = isMini ? "T-SPIN MINI" : "T-SPIN";
      if (lines >= 1) subtitle = (lines === 1 ? "SINGLE" : lines === 2 ? "DOUBLE" : "TRIPLE");
    } else if (lines === 4) {
      title = "TETRIS";
    } else if (lines > 0) {
      title = (lines === 1 ? "SINGLE" : lines === 2 ? "DOUBLE" : "TRIPLE");
    }

    if (title) this._spawnPrimary(title, subtitle || null);
    if (b2b > 1 && (lines === 4 || isTSpin)) this._spawnBadge(`B2B ×${b2b}`);
    if (combo > 0) this._spawnBadge(`REN ${combo}`);
  }
}