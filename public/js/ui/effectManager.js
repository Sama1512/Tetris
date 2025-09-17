// 中央見出し＋右下バッジ演出。バッジは大きめ・明るい色で縦積み表示。
// 使い方：new Effects(canvas [, { comboLabel:"REN", badgeScale:1.35 }])

export class Effects {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {{comboLabel?: string, badgeScale?: number}} opts
   */
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.comboLabel = opts.comboLabel || "REN";
    this.badgeScale = Number.isFinite(opts.badgeScale) ? opts.badgeScale : 1.35;

    // 一度だけCSS注入
    if (!document.getElementById("effects-style")) {
      const style = document.createElement("style");
      style.id = "effects-style";
      style.textContent = `
        :root {
          --fx-badge-scale: 1.35;
        }
        @keyframes popFade {
          0% { transform: scale(0.92); opacity: 0; filter: blur(1px); }
          10% { transform: scale(1.04); opacity: 1; filter: blur(0); }
          70% { opacity: 1; }
          100% { transform: scale(1.04) translateY(-8px); opacity: 0; }
        }
        .fx-layer { position:absolute; inset:0; pointer-events:none; }
        .fx-center { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; }

        /* 見出し（中央）。サイズを一段階アップ */
        .fx-primary {
          font-family: system-ui,-apple-system,Segoe UI,Roboto,"Noto Sans JP",sans-serif;
          font-weight: 900; text-align: center; line-height: 1.1;
          padding: 10px 16px; border-radius: 18px;
          background: rgba(0,0,0,0.45); color:#fff;
          text-shadow: 0 2px 8px rgba(0,0,0,0.6);
          animation: popFade 900ms ease forwards; max-width: 92%;
        }
        .fx-primary .big { font-size: clamp(24px, 6.2vw, 56px); letter-spacing: .06em; }
        .fx-primary .mid { font-size: clamp(14px, 3.4vw, 24px); opacity: .95; margin-top: 6px; }

        /* 右下バッジの縦積み。スケールでサイズ可変 */
        .fx-badges {
          position:absolute;
          right: calc(10px * var(--fx-badge-scale));
          bottom: calc(10px * var(--fx-badge-scale));
          display:flex; flex-direction:column; gap: calc(8px * var(--fx-badge-scale));
          align-items:flex-end; pointer-events:none;
        }
        .fx-badge {
          padding: calc(7px * var(--fx-badge-scale)) calc(12px * var(--fx-badge-scale));
          border-radius: calc(14px * var(--fx-badge-scale));
          font-family: system-ui,-apple-system,Segoe UI,Roboto,"Noto Sans JP",sans-serif;
          font-weight: 900;
          font-size: calc(16px * var(--fx-badge-scale));
          letter-spacing: .02em;
          color:#fff;
          box-shadow: 0 6px 18px rgba(0,0,0,0.28);
          animation: popFade 1400ms ease forwards;
        }
        /* 明るいカラーを用途別に */
        .fx-badge.b2b {
          background: linear-gradient(135deg, #00c2ff, #1e88e5);
          color: #00121a;
          text-shadow: 0 1px 0 rgba(255,255,255,.35);
        }
        .fx-badge.ren {
          background: linear-gradient(135deg, #ffd54f, #ff9800);
          color: #261700;
          text-shadow: 0 1px 0 rgba(255,255,255,.35);
        }
        .fx-badge.ac {
          background: linear-gradient(135deg, #fff176, #ffd54f, #ffb300);
          color: #3a2d00;
          text-shadow: 0 1px 0 rgba(255,255,255,.35);
        }
        /* 予備（必要なら追加で使える） */
        .fx-badge.info {
          background: linear-gradient(135deg, #64ffda, #00e5ff);
          color: #00333d;
          text-shadow: 0 1px 0 rgba(255,255,255,.35);
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
    // スケールを反映
    this.layer.style.setProperty("--fx-badge-scale", String(this.badgeScale));
    parent.appendChild(this.layer);

    this.center = document.createElement("div");
    this.center.className = "fx-center";
    this.layer.appendChild(this.center);

    this.badges = document.createElement("div");
    this.badges.className = "fx-badges";
    this.layer.appendChild(this.badges);

    this._headlineNode = null;
  }

  destroy() { this.layer?.remove(); }

  /* 見出し（中央） */
  _showHeadline(title, subtitle=null) {
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
    setTimeout(() => { if (this._headlineNode===box) this._headlineNode=null; box.remove(); }, 1100);
  }

  /* バッジ（右下）：同文言が直前にあれば更新扱い */
  _showBadge(text, cls = "") {
    // 既存同文言を消して最新だけ出す（縦積み・重なり防止）
    [...this.badges.children].forEach(n => { if (n.textContent === text) n.remove(); });
    const b = document.createElement("div");
    b.className = "fx-badge" + (cls ? " " + cls : "");
    b.textContent = text;
    this.badges.appendChild(b);
    setTimeout(() => b.remove(), 1500);
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

    // 見出し（中央）
    if (perfectClear) {
      const sub = (lines === 4 ? "TETRIS" : isTSpin ? "T-SPIN" :
                  (lines ? `${lines} LINE${lines>1?"S":""}` : ""));
      this._showHeadline("ALL CLEAR", sub || null);
      // ALL CLEARはバッジも派手めに
      this._showBadge("ALL CLEAR!", "ac");
    } else if (isTSpin) {
      const title = isMini ? "T-SPIN MINI" : "T-SPIN";
      const sub = lines === 1 ? "SINGLE" : lines === 2 ? "DOUBLE" : lines === 3 ? "TRIPLE" : null;
      this._showHeadline(title, sub);
    } else if (lines === 4) {
      this._showHeadline("TETRIS", null);
    } else if (lines > 0) {
      this._showHeadline(lines === 1 ? "SINGLE" : lines === 2 ? "DOUBLE" : "TRIPLE", null);
    }

    // バッジ（右下：縦並び／大きめ／色分け）
    if (b2b > 1 && (lines === 4 || isTSpin)) this._showBadge(`B2B`, "b2b");
    // B2Bの回数表示を消す場合は上行をコメントアウトし、下行のコメントアウトを外す
    // if (b2b > 1 && (lines === 4 || isTSpin)) this._showBadge(`B2B ×${b2b}`, "b2b");
    if (combo > 0) this._showBadge(`${this.comboLabel} ${combo}`, "ren");
  }
}