// public/js/ui/effectManager.js
// Canvas親にオーバーレイを重ねて、見出し（T-SPIN / MINI / TETRIS / SINGLE...）と
// 右下バッジ（B2B ×N / REN N）を表示。ResizeObserverは使わず CSS の inset:0 で追従。

export class Effects {
  constructor(canvas) {
    this.canvas = canvas;

    // 一度だけCSSを注入
    if (!document.getElementById("effects-style")) {
      const style = document.createElement("style");
      style.id = "effects-style";
      style.textContent = `
        @keyframes popFade {
          0% { transform: scale(0.92); opacity: 0; filter: blur(1px); }
          10% { transform: scale(1.04); opacity: 1; filter: blur(0); }
          70% { opacity: 1; }
          100% { transform: scale(1.04) translateY(-8px); opacity: 0; }
        }
        .fx-layer {
          position: absolute; inset: 0; pointer-events: none;
          display: flex; align-items: center; justify-content: center; overflow: hidden;
        }
        .fx-primary {
          font-family: system-ui,-apple-system,Segoe UI,Roboto,"Noto Sans JP",sans-serif;
          font-weight: 900; text-align: center; line-height: 1.1;
          padding: 8px 14px; border-radius: 16px;
          background: rgba(0,0,0,0.45); color: #fff;
          text-shadow: 0 2px 8px rgba(0,0,0,0.6);
          animation: popFade 900ms ease forwards; max-width: 90%;
        }
        .fx-primary .big { font-size: clamp(18px, 4.8vw, 40px); letter-spacing: .06em; }
        .fx-primary .mid { font-size: clamp(12px, 3vw, 20px); opacity: .9; margin-top: 4px; }
        .fx-badge {
          position: absolute; right: 8px; bottom: 8px;
          font-family: system-ui,-apple-system,Segoe UI,Roboto,"Noto Sans JP",sans-serif;
          font-weight: 700; padding: 6px 10px; border-radius: 12px;
          background: rgba(0,0,0,0.5); color: #fff; font-size: 14px;
          text-shadow: 0 1px 4px rgba(0,0,0,0.4); animation: popFade 1200ms ease forwards;
        }
      `;
      document.head.appendChild(style);
    }

    // 親に絶対配置でレイヤを追加（親が static なら relative に）
    const parent = this.canvas.parentElement || document.body;
    if (getComputedStyle(parent).position === "static") parent.style.position = "relative";

    this.layer = document.createElement("div");
    this.layer.className = "fx-layer";
    parent.appendChild(this.layer);
  }

  destroy() { this.layer?.remove(); }

  _headline(title, subtitle) {
    const box = document.createElement("div");
    box.className = "fx-primary";
    const big = document.createElement("div");
    big.className = "big"; big.textContent = title;
    box.appendChild(big);
    if (subtitle) {
      const mid = document.createElement("div");
      mid.className = "mid"; mid.textContent = subtitle;
      box.appendChild(mid);
    }
    this.layer.appendChild(box);
    setTimeout(() => box.remove(), 1100);
  }

  _badge(text) {
    const b = document.createElement("div");
    b.className = "fx-badge"; b.textContent = text;
    this.layer.appendChild(b);
    setTimeout(() => b.remove(), 1400);
  }

  /**
   * lines: 消去行数
   * type:  "normal" | "tspin" | "tspin-mini"
   * b2b:   連鎖段数（1以上でB2B継続）
   * combo: REN数（0が最初の連続消去）
   * perfectClear: 全消し
   */
  onClear({ lines, type, b2b, combo, perfectClear }) {
    const isMini = (type === "tspin-mini");
    const isTSpin = (type === "tspin" || isMini);

    // 見出し
    if (perfectClear) {
      const sub = (lines === 4 ? "TETRIS" : isTSpin ? "T-SPIN" : (lines ? `${lines} LINE${lines>1?"S":""}` : ""));
      this._headline("ALL CLEAR", sub || null);
    } else if (isTSpin) {
      const title = isMini ? "T-SPIN MINI" : "T-SPIN";
      const sub = lines === 1 ? "SINGLE" : lines === 2 ? "DOUBLE" : lines === 3 ? "TRIPLE" : null;
      this._headline(title, sub);
    } else if (lines === 4) {
      this._headline("TETRIS", null);
    } else if (lines > 0) {
      this._headline(lines === 1 ? "SINGLE" : lines === 2 ? "DOUBLE" : "TRIPLE", null);
    }

    // バッジ
    if (b2b > 1 && (lines === 4 || isTSpin)) this._badge(`B2B ×${b2b}`);
    if (combo > 0) this._badge(`REN ${combo}`);
  }
}