// 中央見出し＋右下バッジ演出。重なり防止のためバッジは縦積みスタックで表示。

export class Effects {
  constructor(canvas, { comboLabel = "REN" } = {}) {
    this.canvas = canvas;
    this.comboLabel = comboLabel; // "REN" or "COMBO" 好きな表記

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
        .fx-layer { position:absolute; inset:0; pointer-events:none; }
        .fx-center {
          position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
        }
        .fx-primary {
          font-family: system-ui,-apple-system,Segoe UI,Roboto,"Noto Sans JP",sans-serif;
          font-weight: 900; text-align: center; line-height: 1.1;
          padding: 8px 14px; border-radius: 16px;
          background: rgba(0,0,0,0.45); color:#fff;
          text-shadow: 0 2px 8px rgba(0,0,0,0.6);
          animation: popFade 900ms ease forwards; max-width: 90%;
        }
        .fx-primary .big { font-size: clamp(18px, 4.8vw, 40px); letter-spacing: .06em; }
        .fx-primary .mid { font-size: clamp(12px, 3vw, 20px); opacity: .9; margin-top: 4px; }

        /* 右下バッジの縦積みコンテナ（重なり防止） */
        .fx-badges {
          position:absolute; right:8px; bottom:8px;
          display:flex; flex-direction:column; gap:6px; align-items:flex-end;
          pointer-events:none;
        }
        .fx-badge {
          padding:6px 10px; border-radius:12px;
          background: rgba(0,0,0,0.5); color:#fff;
          font-family: system-ui,-apple-system,Segoe UI,Roboto,"Noto Sans JP",sans-serif;
          font-weight:700; font-size:14px;
          text-shadow: 0 1px 4px rgba(0,0,0,0.4);
          animation: popFade 1200ms ease forwards;
        }
      `;
      document.head.appendChild(style);
    }

    // 親のpositionをrelativeに
    const parent = this.canvas.parentElement || document.body;
    if (getComputedStyle(parent).position === "static") parent.style.position = "relative";

    // レイヤ構成：大枠 → 中央見出し / 右下バッジ
    this.layer = document.createElement("div");
    this.layer.className = "fx-layer";
    parent.appendChild(this.layer);

    this.center = document.createElement("div");
    this.center.className = "fx-center";
    this.layer.appendChild(this.center);

    this.badges = document.createElement("div");
    this.badges.className = "fx-badges";
    this.layer.appendChild(this.badges);

    // 表示中の見出しを1つに保つための参照
    this._headlineNode = null;
  }

  destroy() { this.layer?.remove(); }

  _showHeadline(title, subtitle=null) {
    // 既存見出しは消す（1つだけにする）
    if (this._headlineNode) { this._headlineNode.remove(); this._headlineNode = null; }

    const box = document.createElement("div");
    box.className = "fx-primary";
    const big = document.createElement("div"); big.className = "big"; big.textContent = title;
    box.appendChild(big);
    if (subtitle) {
      const mid = document.createElement("div"); mid.className = "mid"; mid.textContent = subtitle;
      box.appendChild(mid);
    }
    this.center.appendChild(box);
    this._headlineNode = box;
    setTimeout(() => { box.remove(); if (this._headlineNode===box) this._headlineNode=null; }, 1100);
  }

  _showBadge(text) {
    // 同じ文言が直前に出ていれば入れ替え（重複防止）
    [...this.badges.children].forEach(n => { if (n.textContent === text) n.remove(); });

    const b = document.createElement("div");
    b.className = "fx-badge";
    b.textContent = text;
    this.badges.appendChild(b);
    setTimeout(() => b.remove(), 1400);
  }

  onClear({ lines, type, b2b, combo, perfectClear }) {
    const isMini = (type === "tspin-mini");
    const isTSpin = (type === "tspin" || isMini);

    // 見出し（中央）
    if (perfectClear) {
      const sub = (lines === 4 ? "TETRIS" : isTSpin ? "T-SPIN" : (lines ? `${lines} LINE${lines>1?"S":""}` : ""));
      this._showHeadline("ALL CLEAR", sub || null);
    } else if (isTSpin) {
      const title = isMini ? "T-SPIN MINI" : "T-SPIN";
      const sub = lines === 1 ? "SINGLE" : lines === 2 ? "DOUBLE" : lines === 3 ? "TRIPLE" : null;
      this._showHeadline(title, sub);
    } else if (lines === 4) {
      this._showHeadline("TETRIS", null);
    } else if (lines > 0) {
      this._showHeadline(lines === 1 ? "SINGLE" : lines === 2 ? "DOUBLE" : "TRIPLE", null);
    }

    // バッジ（右下：縦並び）
    if (b2b > 1 && (lines === 4 || isTSpin)) this._showBadge(`B2B`);
    // もしB2Bの回数を表示したいなら上の行を次に差し替え
    // if (b2b > 1 && (lines === 4 || isTSpin)) this._showBadge(`B2B ×${b2b}`);
    if (combo > 0) this._showBadge(`${this.comboLabel} ${combo}`);
  }
}