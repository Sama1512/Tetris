export class ScoreManager {
  constructor() {
    this.reset();
  }

  reset() {
    this.score = 0;
    this.lines = 0;
    this.level = 1;
  }

  addLines(cleared) {
    if (typeof cleared !== "number" || isNaN(cleared)) {
      console.warn("⚠️ addLines received invalid value:", cleared);
      return;
    }

    const baseScores = [0, 100, 300, 500, 800];
    const points = baseScores[cleared] || 0;

    this.lines += cleared;
    this.level = Math.floor(this.lines / 10) + 1;
    this.score += points * this.level;
  }

  getState() {
    return {
      score: this.score,
      lines: this.lines,
      level: this.level
    };
  }
}