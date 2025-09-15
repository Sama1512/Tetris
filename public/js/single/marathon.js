// rAF一本化の落下ループ（setIntervalは使わない）
import { SingleGameBase } from "./single_game.js";
import { updateUI } from "../ui/ui.js";

export class MarathonGame extends SingleGameBase {
  constructor(canvasId = "game-canvas", nextCount = 5, onStateUpdate = null) {
    super(canvasId, nextCount, onStateUpdate);
    this.level = 1;
    this._linesForLevel = 0;
    this._rafId = null;
    this._lastTs = 0;
    this._acc = 0;
    this._paused = false;
    this._dropSecTable = [1.0,0.8,0.7,0.6,0.5,0.45,0.40,0.35,0.30,0.26,0.23,0.20,0.18,0.16,0.14,0.12,0.10];
  }
  getDropIntervalSec() {
    const v = this._dropSecTable[Math.min(Math.max(this.level,1)-1, this._dropSecTable.length-1)];
    return (Number.isFinite(v) && v > 0.01) ? v : 0.5;
  }
  async start(onStateUpdate) {
    this.onStateUpdate = onStateUpdate ?? ((hud)=>updateUI(hud));
    await super.start();
    this._lastTs = performance.now();
    const loop = (ts) => {
      if (this._paused || this.isGameOver) { this._lastTs = ts; this._rafId = requestAnimationFrame(loop); return; }
      const dt = (ts - this._lastTs)/1000; this._lastTs = ts; this._acc += dt;
      const step = this.getDropIntervalSec();
      const maxCarry = step * 5; if (this._acc > maxCarry) this._acc = maxCarry;
      while (this._acc >= step) { this.moveMino(0,1); this._acc -= step; }
      this._rafId = requestAnimationFrame(loop);
    };
    this._rafId = requestAnimationFrame(loop);
    document.addEventListener("visibilitychange", () => { this._paused = document.hidden; });
  }
  onClear(lines) {
    if (!lines) return;
    this._linesForLevel += lines;
    while (this._linesForLevel >= 10) { this._linesForLevel -= 10; this.level++; }
  }
  dispose(){ if (this._rafId) cancelAnimationFrame(this._rafId); this._rafId = null; }
}

// マラソン起動（このファイル1本だけを <script type="module"> で読み込むこと）
window.addEventListener("DOMContentLoaded", () => {
  if (window.__TETRIS_GAME_RUNNING__) return;
  window.__TETRIS_GAME_RUNNING__ = "marathon";
  const game = new MarathonGame("game-canvas", 5, (hud)=>updateUI(hud));
  game.start();
});