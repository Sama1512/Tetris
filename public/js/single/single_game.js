import { initDraw, drawField, drawMino, drawNext, drawHold, setDrawState, drawGhost } from "../core/draw.js";
import { initField, checkCollision, placeMino, clearLines, isPerfectClear } from "../core/field.js";
import { getNextBag, rotateMino, cloneMino } from "../core/mino.js";
import { initInput } from "../core/input.js";
import { ScoreManager } from "../core/score.js";
import { classifyTSpinStrict } from "../core/tspin.js";
import { Effects } from "../ui/effectManager.js";
import { loadThemeFromSettings } from "../ui/theme.js";
import { Sound } from "../ui/sound.js";

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

    // 設定
    this.enableHold = true;
    this.enableHardDrop = true;
    this.reverseRotation = false;
    this.showGhost = true;

    // 直前アクション
    this.lastAction = "none";

    // ロック遅延
    this.lockDelayMs = 500;
    this.isGrounded = false;
    this.lockDeadline = 0;
    this.lockTimerId = null;

    // 有限リセット
    this.maxLockResets = 15;
    this.lockResets = 0;
    this.groundContactY = null;

    // リセットポリシー
    this.lockResetPolicy = "move";

    // 追加トグル
    this.lenientTSpin = false;
    this.effectsEnabled = true;
    this.badgeScale = 1.35;
    this.comboLabel = "REN";

    // サウンド
    this.sfx = null;

    this.init();
  }

  // settings と単発キーをマージ（単発キーが優先）
  _loadSettings() {
    const toBool = (v, d) => {
      if (typeof v === "boolean") return v;
      if (typeof v === "number") return v !== 0;
      if (typeof v === "string") {
        const s = v.toLowerCase();
        if (["1","true","on","yes"].includes(s)) return true;
        if (["0","false","off","no"].includes(s)) return false;
      }
      return d;
    };
    const readBool = k => { const v = localStorage.getItem(k); return v==null?undefined:toBool(v,undefined); };
    const readInt  = k => { const v = localStorage.getItem(k); if (v==null) return undefined; const n=Number(v); return Number.isFinite(n)?(n|0):undefined; };
    const readNum  = k => { const v = localStorage.getItem(k); if (v==null) return undefined; const n=Number(v); return Number.isFinite(n)?n:undefined; };
    const readStr  = k => { const v = localStorage.getItem(k); return v==null?undefined:String(v); };

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
      "show-ghost":         readBool("show-ghost"),
      "enable-hold":        readBool("enable-hold"),
      "enable-harddrop":    readBool("enable-harddrop"),
      "reverse-rotation":   readBool("reverse-rotation"),
      "show-time":          readBool("show-time"),
      "next-count":         readInt ("next-count"),
      "das":                readInt ("das"),
      "arr":                readInt ("arr"),
      "lock-delay":         readInt ("lock-delay"),
      "lock-resets":        readInt ("lock-resets"),
      "lock-reset-policy":  readStr ("lock-reset-policy"),
      // 追加トグル
      "lenient-tspin":      readBool("lenient-tspin"),
      "effects-enabled":    readBool("effects-enabled"),
      "effects-badge-scale":readNum ("effects-badge-scale"),
      "combo-label":        readStr ("combo-label"),
    };
    Object.keys(flat).forEach(k => flat[k] === undefined && delete flat[k]);
    const s = { ...base, ...flat };

    const gv = (h,c,d)=> (s[h] ?? s[c] ?? d);
    const toB = (h,c,d)=> toBool(gv(h,c,d), d);
    const toN = (h,c,d)=> { const v=gv(h,c,d); return Number.isFinite(v)?v:d; };
    const toS = (h,c,d)=> { const v=gv(h,c,d); return (v!=null)?String(v):d; };

    this.showGhost       = toB("show-ghost","showGhost", this.showGhost);
    this.enableHold      = toB("enable-hold","enableHold", this.enableHold);
    this.enableHardDrop  = toB("enable-harddrop","enableHardDrop", this.enableHardDrop);
    this.reverseRotation = toB("reverse-rotation","reverseRotation", this.reverseRotation);

    const nc = gv("next-count","nextCount", this.nextCount);
    if (Number.isFinite(nc) && nc > 0) this.nextCount = nc|0;

    const ld = gv("lock-delay","lockDelay", this.lockDelayMs);
    if (Number.isFinite(ld) && ld >= 0) this.lockDelayMs = ld|0;

    const lr = gv("lock-resets","lockResets", this.maxLockResets);
    if (Number.isFinite(lr) && lr >= 0) this.maxLockResets = lr|0;

    const pol = (gv("lock-reset-policy","lockResetPolicy", this.lockResetPolicy) || "").toString().toLowerCase();
    if (pol === "move" || pol === "step") this.lockResetPolicy = pol;

    // ★追加トグル系
    this.lenientTSpin   = toB("lenient-tspin",     "lenientTSpin",     this.lenientTSpin);
    this.effectsEnabled = toB("effects-enabled",   "effectsEnabled",   this.effectsEnabled);
    this.badgeScale     = toN("effects-badge-scale","effectsBadgeScale",this.badgeScale);
    this.comboLabel     = toS("combo-label",       "comboLabel",       this.comboLabel);

    // 正規化保存（将来は settings 一つで読めるように）
    try {
      const normalized = {
        "show-ghost": this.showGhost,
        "enable-hold": this.enableHold,
        "enable-harddrop": this.enableHardDrop,
        "reverse-rotation": this.reverseRotation,
        "next-count": this.nextCount,
        "lock-delay": this.lockDelayMs,
        "lock-resets": this.maxLockResets,
        "lock-reset-policy": this.lockResetPolicy,
        "lenient-tspin": this.lenientTSpin,
        "effects-enabled": this.effectsEnabled,
        "effects-badge-scale": this.badgeScale,
        "combo-label": this.comboLabel,
        ...(Number.isFinite(s.das) ? { das: s.das|0 } : {}),
        ...(Number.isFinite(s.arr) ? { arr: s.arr|0 } : {}),
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
      nextCount:this.nextCount, lockDelayMs:this.lockDelayMs,
      maxLockResets:this.maxLockResets, lockResetPolicy:this.lockResetPolicy,
      lenientTSpin:this.lenientTSpin, effectsEnabled:this.effectsEnabled,
      badgeScale:this.badgeScale, comboLabel:this.comboLabel
    });
  }

  init() {
    initDraw(this.canvas);
    loadThemeFromSettings();          // ★ 起動時に必ずテーマ適用
    window.__game = this;
    this._loadSettings();
    initInput(this.handleKey.bind(this));
    this.effects = this.effectsEnabled ? new Effects(this.canvas, { comboLabel: this.comboLabel, badgeScale: this.badgeScale }) : null;

    // ★ サウンド：初回操作でAudioContext解錠／設定反映
    this.sfx = new Sound();
    this.sfx.attachUnlock();
  }

  reset() {
    this.field = initField();
    this.nextQueue = [...getNextBag()];
    while (this.nextQueue.length < this.nextCount) this.nextQueue.push(...getNextBag());
    this.holdMino = null;
    this.canHold = true;
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
    this.lastAction = "none";
    this.lockResets = 0;
    this.groundContactY = null;
    this._leaveGrounded();

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
    this.lastAction = "move";
    this._leaveGrounded();
    this.sfx?.play("hold");          // ★
    this.render();
  }

  rotate(dir) {
    const realDir =
      (dir === "left")
        ? (this.reverseRotation ? "right" : "left")
        : (this.reverseRotation ? "left"  : "right");
    const rr = rotateMino(this.currentMino, realDir, this.field, checkCollision);
    if (rr && rr.kickIndex !== -1) {
      this.currentMino = rr.mino;
      this.lastAction = "rotate";
      if (this.onGround()) this._resetGroundedTimer(); else this._leaveGrounded();
      this.sfx?.play("rotate");       // ★
      this.render();
    }
  }

  hardDrop() {
    if (!this.enableHardDrop) return;
    while (!checkCollision(this.field, { ...this.currentMino, y: this.currentMino.y + 1 })) this.currentMino.y++;
    this.lastAction = "move";
    this.sfx?.play("hard");           // ★
    this.lockAndScore();
  }

  moveMino(dx, dy, source = "user") {
    const next = { ...this.currentMino, x: this.currentMino.x + dx, y: this.currentMino.y + dy };

    if (!checkCollision(this.field, next)) {
      this.currentMino = next;
      const resetByMove = this.lenientTSpin ? (dx !== 0) : (dx !== 0 || dy === 1);
      if (resetByMove) this.lastAction = "move";
      if (dx !== 0) this.sfx?.play("move", { volume: 0.4 }); // ★ 横移動だけSE
      if (this.onGround()) {
        if (source === "user") this._resetGroundedTimer();
      } else {
        this._leaveGrounded();
      }
      this.render();
    } else if (dy === 1) {
      if (source === "gravity") {
        if (!this.isGrounded) this._enterGrounded();
      } else {
        if (!this.isGrounded) this._enterGrounded(); else this._resetGroundedTimer();
      }
    }
    this.updateState();
  }

  // === ロック遅延管理（省略：あなたの最新版そのまま） ===
  onGround() { return checkCollision(this.field, { ...this.currentMino, y: this.currentMino.y + 1 }); }
  _clearLockTimer() { if (this.lockTimerId) { clearTimeout(this.lockTimerId); this.lockTimerId = null; } }
  _armLockTimer() {
    this._clearLockTimer();
    const ms = Math.max(0, this.lockDeadline - performance.now());
    this.lockTimerId = setTimeout(() => {
      if (this.isGrounded && this.onGround()) {
        this.lockAndScore();
      }
    }, ms);
  }
  _enterGrounded() {
    this.isGrounded = true;
    this.lockDeadline = performance.now() + this.lockDelayMs;
    this.groundContactY = this.currentMino.y;
    this._armLockTimer();
  }
  _resetGroundedTimer() {
    if (!this.isGrounded) return;
    if (this.lockResets >= this.maxLockResets) return;
    if (this.lockResetPolicy === "step") {
      if (this.currentMino.y <= (this.groundContactY ?? this.currentMino.y)) return;
    }
    this.lockResets++;
    this.groundContactY = Math.max(this.groundContactY ?? this.currentMino.y, this.currentMino.y);
    this.lockDeadline = performance.now() + this.lockDelayMs;
    this._armLockTimer();
  }
  _leaveGrounded() {
    this.isGrounded = false;
    this._clearLockTimer();
    this.groundContactY = null;
  }

  // === スコア／判定／演出／SE ===
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
    this._leaveGrounded();

    const pc  = (cleared > 0) && isPerfectClear(this.field);
    const res = this.scoreManager.applyClear({ lines: cleared, type, perfectClear: pc });

    // ★ SE
    if (pc) this.sfx?.play("pc");
    else if (cleared === 4) this.sfx?.play("tetris");
    else if (type === "tspin" || type === "tspin-mini") this.sfx?.play("tspin");
    else if (cleared > 0) this.sfx?.play("clear1", { rate: 1 + (cleared-1)*0.1 });

    this.effects?.onClear({ lines: cleared, type, b2b: res.b2b, combo: res.combo, perfectClear: pc });
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
      case "moveLeft":  this.moveMino(-1, 0, "user"); break;
      case "moveRight": this.moveMino( 1, 0, "user"); break;
      case "softDrop":  this.moveMino( 0, 1, "user"); break;
      case "rotateLeft":  this.rotate("left");  break;
      case "rotateRight": this.rotate("right"); break;
      case "hold": this.hold(); break;
      case "hardDrop": this.hardDrop(); break;
    }
  }
}