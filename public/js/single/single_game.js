import { initDraw, drawField, drawMino, drawNext, drawHold, setDrawState, drawGhost } from "../core/draw.js";
import { initField, checkCollision, placeMino, clearLines, isPerfectClear } from "../core/field.js";
import { getNextBag, rotateMino, cloneMino } from "../core/mino.js";
import { initInput } from "../core/input.js";
import { ScoreManager } from "../core/score.js";
import { classifyTSpinStrict } from "../core/tspin.js";
import { Effects } from "../ui/effectManager.js"; // ★追加

export class SingleGameBase {
  constructor(canvasId, nextCount = 5, onStateUpdate = null) {
    this.canvas = document.getElementById(canvasId);
    this.currentMino = null;
    this.holdMino = null;
    this.canHold = true;
    this.nextQueue = [];
    this.field = initField();
    this.nextCount = nextCount;
    this.onStateUpdate = onStateUpdate;

    this.scoreManager = new ScoreManager();
    this.isGameOver = false;

    this.enableHold = true;
    this.enableHardDrop = true;
    this.reverseRotation = false;
    this.showGhost = true;

    // 直前アクション（'rotate' | 'move' | 'none'）
    this.lastAction = "none";
    this.init();
  }

  _loadSettings() {
    const toBool = (v, def) => {
      if (typeof v === "boolean") return v;
      if (typeof v === "number") return v !== 0;
      if (typeof v === "string") {
        const s = v.toLowerCase();
        if (["1","true","on","yes"].includes(s)) return true;
        if (["0","false","off","no"].includes(s)) return false;
      }
      return def;
    };
    const readBool = (k) => { const v = localStorage.getItem(k); return v==null?undefined:toBool(v,undefined); };
    const readInt  = (k) => { const v = localStorage.getItem(k); if (v==null) return undefined; const n=Number(v); return Number.isFinite(n)?(n|0):undefined; };

    const pickSettings = () => {
      const keys = ["settings","tetrisSettings","gameSettings","TetrisSettings","TETRIS_SETTINGS"];
      for (const k of keys) {
        const raw = localStorage.getItem(k);
        if (!raw) continue;
        try { return JSON.parse(raw); } catch {}
      }
      return {};
    };
    const base = pickSettings();
    const flat = {
      "show-ghost":       readBool("show-ghost"),
      "enable-hold":      readBool("enable-hold"),
      "enable-harddrop":  readBool("enable-harddrop"),
      "reverse-rotation": readBool("reverse-rotation"),
      "show-time":        readBool("show-time"),
      "next-count":       readInt("next-count"),
      "das":              readInt("das"),
      "arr":              readInt("arr"),
      "lock-delay":       readInt("lock-delay"),
    };
    Object.keys(flat).forEach(k => flat[k] === undefined && delete flat[k]);
    const s = { ...base, ...flat };

    const gv = (h,c,d)=> (s[h] ?? s[c] ?? d);
    const toB = (h,c,d)=> toBool(gv(h,c,d), d);

    this.showGhost       = toB("show-ghost","showGhost", this.showGhost);
    this.enableHold      = toB("enable-hold","enableHold", this.enableHold);
    this.enableHardDrop  = toB("enable-harddrop","enableHardDrop", this.enableHardDrop);
    this.reverseRotation = toB("reverse-rotation","reverseRotation", this.reverseRotation);

    const nc = gv("next-count","nextCount", this.nextCount);
    if (Number.isFinite(nc) && nc > 0) this.nextCount = nc|0;

    try {
      const normalized = {
        "show-ghost": this.showGhost,
        "enable-hold": this.enableHold,
        "enable-harddrop": this.enableHardDrop,
        "reverse-rotation": this.reverseRotation,
        "next-count": this.nextCount,
        ...(Number.isFinite(s.das) ? { das: s.das|0 } : {}),
        ...(Number.isFinite(s.arr) ? { arr: s.arr|0 } : {}),
        ...(Number.isFinite(s["lock-delay"]) ? { "lock-delay": s["lock-delay"]|0 } : {}),
        ...(typeof s["show-time"] === "boolean" ? { "show-time": s["show-time"] } : {}),
      };
      localStorage.setItem("settings", JSON.stringify(normalized));
    } catch {}

    const holdWrapper =
      document.getElementById("hold-wrapper") ||
      document.getElementById("hold-area") ||
      document.querySelector(".hold-wrapper");
    if (holdWrapper) holdWrapper.style.display = this.enableHold ? "" : "none";

    console.debug("[settings applied]", {
      showGhost:this.showGhost, enableHold:this.enableHold,
      enableHardDrop:this.enableHardDrop, reverseRotation:this.reverseRotation,
      nextCount:this.nextCount,
    });
  }

  init() {
    initDraw(this.canvas);
    window.__game = this;              // デバッグ用に公開
    this._loadSettings();
    initInput(this.handleKey.bind(this));
    // ★演出オーバーレイをマウント
    this.effects = new Effects(this.canvas);
  }

  reset() {
    this.field = initField();
    this.nextQueue = [...getNextBag()];
    while (this.nextQueue.length < this.nextCount) this.nextQueue.push(...getNextBag());
    this.holdMino = null; this.canHold = true;
    this.scoreManager.reset?.();
    this.isGameOver = false;
    this.updateState();
  }

  start() {
    this._loadSettings();
    this.reset();
    this.spawnMino();
  }

  spawnMino() {
    this.currentMino = this.nextQueue.shift();
    if (this.nextQueue.length <= 7) this.nextQueue.push(...getNextBag());
    this.currentMino.x = 4; this.currentMino.y = 0;
    this.canHold = true;
    this.lastAction = "none";           // 新しいミノは無行動スタート
    if (checkCollision(this.field, this.currentMino)) this.onGameOver?.();
    else this.render();
    this.updateState();
  }

  hold() {
    if (!this.enableHold || !this.canHold) return;
    const temp = this.holdMino;
    this.holdMino = cloneMino(this.currentMino);
    if (temp) this.currentMino = cloneMino(temp);
    else { this.currentMino = this.nextQueue.shift(); this.nextQueue.push(...getNextBag()); }
    this.currentMino.x = 4; this.currentMino.y = 0;
    this.canHold = false;
    this.lastAction = "move";           // hold は回転扱いではない
    this.render();
  }

  rotate(dir) {
    const realDir =
      (dir === "left")
        ? (this.reverseRotation ? "right" : "left")
        : (this.reverseRotation ? "left"  : "right");
    // ★SRS版：フィールドと衝突関数を渡す
    const rr = rotateMino(this.currentMino, realDir, this.field, checkCollision);
    // 成功判定：kickIndex が -1 でなければ回転成功（0は無キック成功）
    if (rr && rr.kickIndex !== -1) {
      this.currentMino = rr.mino;
      this.lastAction = "rotate";
      this.render();
    }
  }

  hardDrop() {
    if (!this.enableHardDrop) return;
    while (!checkCollision(this.field, { ...this.currentMino, y: this.currentMino.y + 1 })) this.currentMino.y++;
    this.lastAction = "move";           // ハードドロップしたら回転ではない
    this.lockAndScore();
  }

  moveMino(dx, dy) {
    const next = { ...this.currentMino, x: this.currentMino.x + dx, y: this.currentMino.y + dy };
    if (!checkCollision(this.field, next)) {
      this.currentMino = next;
      // ★strict（推奨）: 横移動 or ソフトドロップで 'move' に落とす
      if (dx !== 0 || dy === 1) this.lastAction = "move";
      // ★lenient にしたいなら上の行を次に差し替え：
      // if (dx !== 0) this.lastAction = "move";  // ソフトドロップは許容
      this.render();
    } else if (dy === 1) {
      this.lockAndScore();              // この時点で lastAction が 'rotate' ならT-Spin
    }
    this.updateState();
  }

  lockAndScore() {
    placeMino(this.field, this.currentMino);
    const fieldBeforeClear = this.field.map(r => r.slice());
    const cleared = clearLines(this.field);

    const type = classifyTSpinStrict(
      this.currentMino,
      fieldBeforeClear,
      { rotated: this.lastAction === "rotate" },
      cleared
    );
    this.lastAction = "none";

    const pc = (cleared > 0) && isPerfectClear(this.field);
    const res = this.scoreManager.applyClear({ lines: cleared, type, perfectClear: pc });

    // ★演出（見出し＋バッジ）
    this.effects?.onClear({ lines: cleared, type, b2b: res.b2b, combo: res.combo, perfectClear: pc });

    // 互換フック（必要ならUIで拾える）
    this.onClear?.(cleared, { type, perfectClear: pc, ...res });

    this.spawnMino();
  }

  render() {
    drawField(this.field);
    if (this.showGhost && this.currentMino) drawGhost(this.field, this.currentMino);
    drawMino(this.currentMino);
    drawNext(this.nextQueue, this.nextCount);
    drawHold(this.holdMino);
    setDrawState({ field:this.field, mino:this.currentMino, queue:this.nextQueue, count:this.nextCount, hold:this.holdMino });
  }

  updateState() {
    this.onStateUpdate?.({ field:this.field, mino:this.currentMino, queue:this.nextQueue, count:this.nextCount, hold:this.holdMino });
  }

  handleKey(action) {
    if (this.isGameOver) return;
    switch (action) {
      case "moveLeft": this.moveMino(-1, 0); break;
      case "moveRight": this.moveMino(1, 0); break;
      case "softDrop": this.moveMino(0, 1); break;
      case "rotateLeft": this.rotate("left"); break;
      case "rotateRight": this.rotate("right"); break;
      case "hold": this.hold(); break;
      case "hardDrop": this.hardDrop(); break;
    }
  }
}