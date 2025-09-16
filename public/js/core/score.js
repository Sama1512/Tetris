// フェーズ1互換を維持しつつ、B2B/REN/ALL CLEAR に対応したスコア管理

export class ScoreManager {
  constructor() {
    this.score = 0;
    this.lines = 0;
    this.level = 1;

    // 連鎖系
    this.b2b = 0;        // 0=非連鎖 / 1+=B2B中
    this.combo = -1;     // -1=非コンボ / 0+=REN数（直近消去回数-1）
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

  /**
   * フェーズ2用の本命API：行消去と種別に基づきスコア・B2B・REN更新
   * @param {Object} param0
   *   lines: number … 消去した行数
   *   type: "normal" | "tspin" | "tspin-mini"
   *   perfectClear: boolean … ALL CLEAR
   * @returns {Object} { added, b2b, combo, desc }
   */
  applyClear({ lines, type = "normal", perfectClear = false }) {
    // 消去なし → コンボ切れ、B2Bは維持（ガイドライン準拠）
    if (!lines || lines <= 0) {
      this.combo = -1;
      this.lastMessage = "none";
      return { added: 0, b2b: this.b2b, combo: this.combo, desc: "none" };
    }

    // REN更新（消去あり）
    this.combo = (this.combo < 0) ? 0 : this.combo + 1;

    // 総ライン
    this.lines += lines;

    // 基本点
    const base = this._basePoints(lines, type);

    // B2B判定（TETRIS or T-SPIN 系が対象）
    const eligible = (lines === 4) || (type === "tspin") || (type === "tspin-mini");
    const wasInChain = this.b2b > 0;
    let pts = base;

    if (eligible) {
      this.b2b = wasInChain ? this.b2b + 1 : 1;
      if (wasInChain) pts = Math.floor(pts * 1.5); // B2B継続時に1.5倍
    } else {
      this.b2b = 0;
    }

    // RENボーナス（+50 × REN数）… combo=0 は最初の消去
    if (this.combo > 0) pts += 50 * this.combo;

    // ALL CLEAR
    if (perfectClear) pts += 3500;

    this.score += pts;

    const desc = this._describe(lines, type, (this.b2b > 1), this.combo, perfectClear);
    this.lastMessage = desc;

    return { added: pts, b2b: this.b2b, combo: this.combo, desc };
  }

  /**
   * 旧コード互換（MarathonGameが使っていることがある）
   * 消去行数だけ更新してドロップ速度等の外部制御に使う用。
   * スコアは付けない（必要なら applyClear を使ってね）
   */
  addLines(cleared) {
    if (!cleared || cleared <= 0) {
      this.combo = -1;
      return;
    }
    this.lines += cleared;
    this.combo = (this.combo < 0) ? 0 : this.combo + 1;
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

  // --- 内部ヘルパ ---

  _basePoints(lines, type) {
    // ガイドライン目安
    if (type === "tspin-mini") {
      if (lines === 1) return 200;
      if (lines === 2) return 400; // mini double は便宜上
    }
    if (type === "tspin") {
      if (lines === 1) return 800;
      if (lines === 2) return 1200;
      if (lines === 3) return 1600;
    }
    if (lines === 1) return 100;
    if (lines === 2) return 300;
    if (lines === 3) return 500;
    if (lines === 4) return 800;   // TETRIS
    return 0;
  }

  _describe(lines, type, b2bActive, combo, pc) {
    const parts = [];
    if (type === "tspin") parts.push("T-SPIN");
    if (type === "tspin-mini") parts.push("T-SPIN MINI");
    if (lines === 1) parts.push("SINGLE");
    if (lines === 2) parts.push("DOUBLE");
    if (lines === 3) parts.push("TRIPLE");
    if (lines === 4) parts.push("TETRIS");
    if (b2bActive) parts.push("B2B");
    if (combo > 0) parts.push(`REN ${combo}`);
    if (pc) parts.push("ALL CLEAR");
    return parts.join(" ");
  }
}