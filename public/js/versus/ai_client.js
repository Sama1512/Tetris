// public/versus/ai_client.js
// BFSパスを完全実行するCPUクライアント（重力同期対応版）

const DEFAULT_API_URL = "/move";

// Tick間隔(ms) - レベルが高いほど速い
const TICK_BY_LEVEL = {
  1: 400, 2: 280, 3: 200, 4: 150, 5: 110,
  6: 80,  7: 55,  8: 35,  9: 22, 10: 12,
};

// ハードドロップ前の待機tick数（視覚的なタメ）
const HD_DELAY_BY_LEVEL = {
  1: 0,  2: 45, 3: 28, 4: 16, 5: 10,
  6: 6,  7: 4,  8: 2,  9: 1, 10: 0,
};

function flattenField(field) {
  let s = "";
  let filled = 0;
  for (let y = 0; y < field.length; y++) {
    const row = field[y] ?? [];
    for (let x = 0; x < (field[0]?.length ?? 10); x++) {
      const v = row[x];
      if (v) { s += "1"; filled++; } else { s += "0"; }
    }
  }
  // デバッグ: フィールド状態の確認
  if (filled === 0) console.warn("[AI] board_flat is ALL zeros! field rows:", field.length, "sample cell:", field[19]?.[0]);
  return s;
}

function buildPayload(game, level) {
  const payload = {
    level,
    piece: game.currentMino.type,
    current_y: game.currentMino.y ?? 0,
    board_flat: flattenField(game.field),
    canHold: game.canHold ?? true,
    b2b: game.scoreManager?.b2b || 0,
    combo: game.scoreManager?.combo ?? -1,
  };
  if (game.holdMino?.type) payload.hold = game.holdMino.type[0];
  if (game.nextQueue?.length > 0) {
    payload.next = game.nextQueue
      .slice(0, 5).map(m => m?.type?.[0]).filter(Boolean).join("");
  }
  return payload;
}

export class ApiCPU {
  constructor(game, { level = 5, apiUrl = DEFAULT_API_URL } = {}) {
    this.game = game;
    this.level = level;
    this.apiUrl = apiUrl;
    this.tickMs = TICK_BY_LEVEL[level] ?? 80;
    this.timer = null;
    this._reset();
  }

  _reset() {
    this._lastMino = null;
    this._spawnId = 0;     // FETCHが新スポーンをまたがないためのID
    this._path = [];       // BFSパス（文字列配列）
    this._pathIdx = 0;
    this._phase = "idle";  // idle | fetching | executing | waiting | done
    this._waitTicks = 0;
    this._moveTicks = 0;
    this._holdDone = false;
    this._pieceDone = false;
    this._expectedY = 0;   // 重力同期用
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => this._tick(), this.tickMs);
  }

  stop() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }

  _emit(action) {
    try { this.game.handleKey(action); } catch {}
  }

  _tick() {
    const g = this.game;
    if (!g || g.isGameOver || !g.currentMino) return;

    // 新しいミノ検出：オブジェクト参照ではなく「スポーン判定」で行う
    // moveMino が毎回 {...old} で新オブジェクトを作るため参照比較は使えない
    const cur = g.currentMino;
    const prevY = this._lastMino?.y ?? 999;
    const isNewPiece = this._lastMino === null
      || this._pieceDone                          // 前ピースのHD後は必ず新ピース
      || cur.type !== this._lastMino.type          // 別の種類が来た
      || cur.y < prevY;                            // Y座標が下がった＝新スポーン（ミノは必ず落下方向）

    if (isNewPiece) {
      this._lastMino = cur;
      this._spawnId++;
      this._path = [];
      this._pathIdx = 0;
      this._phase = "idle";
      this._waitTicks = 0;
      this._moveTicks = 0;
      this._holdDone = false;
      this._pieceDone = false;
      this._expectedY = cur.y ?? 0;
    } else {
      // 同じミノが移動で新オブジェクトになっただけ → 参照だけ更新
      this._lastMino = cur;
    }

    if (this._phase === "idle") {
      this._phase = "fetching";
      this._fetchPlan(g);
      return;
    }

    if (this._phase === "fetching") return;

    if (this._phase === "executing") {
      this._moveTicks++;
      // タイムアウト保護: 40tick以上かかったら諦めてHD
      if (this._moveTicks > 40) {
        this._emit("hardDrop");
        this._pieceDone = true;
        this._phase = "done";
        return;
      }
      this._executePath(g);
      return;
    }

    if (this._phase === "waiting") {
      if (this.level <= 1) return; // Lv1: HDしない
      this._waitTicks--;
      if (this._waitTicks <= 0) {
        this._emit("hardDrop");
        this._pieceDone = true;
        this._phase = "done";
      }
      return;
    }
    // done: 何もしない
  }

  async _fetchPlan(g) {
    const fetchSpawnId = this._spawnId;
    try {
      const payload = buildPayload(g, this.level);
      const res = await fetch(this.apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      // フェッチ中に別のピースになっていたら破棄（Stale Fetch防止）
      if (g.isGameOver || this._spawnId !== fetchSpawnId) return;

      // BFSパスを使用（なければHDだけ）
      const pathStr = data.path || "HD,";
      this._path = pathStr.split(",").filter(a => a.length > 0);
      
      // ===== 最適化（Lv8以上）: 末尾の連続する SD を圧縮して高速 HD 化 =====
      if (this.level >= 8) {
        let i = this._path.length - 1;
        if (this._path[i] === "HD") i--;
        while (i >= 0 && this._path[i] === "SD") {
          this._path.splice(i, 1);
          i--;
        }
      }

      console.log(`[AI] piece=${g.currentMino.type} path="${pathStr}" -> optimized length: ${this._path.length} targetX=${data.targetX} rot=${data.rotation}`);

      // HOLDが必要な場合は先頭に追加
      if (data.useHold && g.canHold && !this._holdDone) {
        this._path.unshift("HOLD");
      }

      this._pathIdx = 0;
      this._expectedY = g.currentMino.y ?? 0;
      this._phase = "executing";

      if (this._path.length === 0) this._path = ["HD"];

    } catch (e) {
      console.warn("[AI] fetch error", e);
      this._emit("hardDrop");
      this._phase = "done";
    }
  }

  _executePath(g) {
    if (this._pathIdx >= this._path.length) {
      // パス完了 → 待機フェーズへ
      const delay = HD_DELAY_BY_LEVEL[this.level] ?? 0;
      this._waitTicks = delay;
      this._phase = delay > 0 ? "waiting" : "done";
      if (delay <= 0 && this.level > 1) this._emit("hardDrop");
      return;
    }

    const act = this._path[this._pathIdx];

    if (act === "HOLD") {
      if (!this._holdDone && g.canHold) {
        this._holdDone = true;
        this._emit("hold");
        this._pieceDone = true;  // ← hold後は必ず新ピースとして再検出
      }
      this._pathIdx++;

    } else if (act === "L") {
      this._emit("moveLeft");
      this._pathIdx++;

    } else if (act === "R") {
      this._emit("moveRight");
      this._pathIdx++;

    } else if (act === "CW") {
      this._emit("rotateRight");
      this._pathIdx++;

    } else if (act === "CCW") {
      this._emit("rotateLeft");
      this._pathIdx++;

    } else if (act === "SD") {
      // 重力同期: 自然落下が既に降ろしてくれていればスキップ
      const curY = g.currentMino?.y ?? this._expectedY;
      if (curY > this._expectedY) {
        // 自然落下済み → SDコマンドをスキップ
      } else {
        this._emit("softDrop");
      }
      this._expectedY++;
      this._pathIdx++;

    } else if (act === "HD") {
      const delay = HD_DELAY_BY_LEVEL[this.level] ?? 0;
      if (delay > 0 && this.level > 1) {
        this._waitTicks = delay;
        this._phase = "waiting";
      } else {
        if (this.level > 1) this._emit("hardDrop");
        this._pieceDone = true;
        this._phase = "done";
      }
      this._pathIdx++;

    } else {
      // 不明なコマンドはスキップ
      this._pathIdx++;
    }
  }

  // ガベージ追加等による地形変化時の再計算トリガー
  onGarbageShift(pushedUpLines) {
    if (this._phase === "executing" || this._phase === "waiting") {
      this._expectedY -= pushedUpLines;
      // 地形が変わると事前の経路計画が破綻するため、直ちに新しいプランを立て直す
      this._phase = "idle";
    }
  }
}