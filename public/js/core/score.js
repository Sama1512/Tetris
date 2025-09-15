export class ScoreManager {
  constructor() {
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.b2b = 0;      // 0=非連鎖, 1+=B2B継続
    this.combo = -1;   // -1=非コンボ, 0+=RENカウント
    this.lastMessage = null;
  }

  reset() {
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.b2b = 0;
    this.combo = -1;
    this.lastMessage = null;
  }

  // type: "normal" | "tspin" | "tspin-mini"
  applyClear({ lines, type = "normal", perfectClear = false }) {
    if (lines <= 0) {
      this.combo = -1;                 // コンボ切れ
      this.lastMessage = null;
      return { added: 0, b2b: this.b2b, combo: this.combo, desc: "none" };
    }

    // REN(Combo)
    this.combo = (this.combo < 0) ? 0 : this.combo + 1;
    this.lines += lines;

    // 基本点
    const base = this.basePoints(lines, type);

    // B2B対象手
    const eligible = (lines === 4) || (type === "tspin") || (type === "tspin-mini");
    const wasIn = this.b2b > 0;

    let pts = base;
    if (eligible) {
      this.b2b = wasIn ? this.b2b + 1 : 1;
      if (wasIn) pts = Math.floor(pts * 1.5); // B2Bボーナス
    } else {
      this.b2b = 0;
    }

    // RENボーナス（+50×REN数）
    if (this.combo > 0) pts += 50 * this.combo;

    // パフェ（全消し）ボーナス
    if (perfectClear) pts += 3500;

    this.score += pts;

    const desc = this.describe(lines, type, this.b2b > 1, this.combo, perfectClear);
    this.lastMessage = desc;

    return { added: pts, b2b: this.b2b, combo: this.combo, desc };
  }

  basePoints(lines, type) {
    if (type === "tspin-mini") {
      if (lines === 1) return 200;
      if (lines === 2) return 400; // Mini Doubleは便宜上
    }
    if (type === "tspin") {
      if (lines === 1) return 800;
      if (lines === 2) return 1200;
      if (lines === 3) return 1600;
    }
    if (lines === 1) return 100;
    if (lines === 2) return 300;
    if (lines === 3) return 500;
    if (lines === 4) return 800;
    return 0;
  }

  describe(lines, type, b2bActive, combo, pc) {
    const p = [];
    if (type === "tspin") p.push("T-SPIN");
    if (type === "tspin-mini") p.push("T-SPIN MINI");
    if (lines === 1) p.push("SINGLE");
    if (lines === 2) p.push("DOUBLE");
    if (lines === 3) p.push("TRIPLE");
    if (lines === 4) p.push("TETRIS");
    if (b2bActive) p.push("B2B");
    if (combo > 0) p.push(`REN ${combo}`);
    if (pc) p.push("ALL CLEAR");
    return p.join(" ");
  }

  getState() {
    return {
      score: this.score,
      lines: this.lines,
      level: this.level,
      b2b: this.b2b,
      combo: this.combo,
      lastMessage: this.lastMessage,
    };
  }
}