// public/versus/ai_new.js
// NewCPU v5: coreのSRS/壁キックに全面依存 + Hold分岐（NoHold vs Hold）をスポーン時だけ比較。
// - ミノ構造は {type, rotation, x, y, blocks...}（= あなたの core/mino.js と一致）
// - 新ピース検知は currentMino の参照変化で確実（同種連続でもOK）
// - 経路: 回→横→HD / 横→回→HD / 横→着地直前回転→HD（nearSpin）を比較
// - 評価: 行消し + 整地（穴/段差/高さ）※T-Spinは一旦OFF（安定優先）
// - 1ピース=1計画ロック、待機中は無操作（ギザギザ封殺）
// - 詰まり保険：進展なしでqueue空なら1回だけ回転注入
// - スポーン時に NoHold と Hold の2プランを比較して強い方を採用（Holdコスト微ペナルティ）

import { rotateMino, cloneMino, MINOS } from "../core/mino.js";
import { checkCollision, placeMino } from "../core/field.js";

// --- チューニング係数 ---
const HOLD_COST = 20;        // Holdにわずかなコスト（乱用抑制）
const NEAR_SPIN_FOR_T = false; // TはnearSpinを封印（安定寄せ）

export class NewCPU {
    constructor(game, { tickMs = 80 } = {}) {
        this.game = game;
        this.tickMs = tickMs;
        this.timer = null;
        this.queue = [];

        // 新ピース検知
        this._lastMinoRef = null;
        this._plannedThisPiece = false;

        // 詰まり監視
        this._stuckSig = null;
        this._stuckTicks = 0;
        this._spinInjected = false;
    }

    start(){ if(!this.timer){ this.timer=setInterval(()=>this.tick(), this.tickMs); } }
    stop(){ if(this.timer){ clearInterval(this.timer); this.timer=null; } }

    tick(){
        const g = this.game;
        if(!g || g.isGameOver || !g.currentMino) return;

        // ---- 新ピース検知（参照） ----
        if (this._lastMinoRef !== g.currentMino) {
        this._lastMinoRef = g.currentMino;
        this._plannedThisPiece = false;
        this.queue.length = 0;
        this._stuckSig = null; this._stuckTicks = 0; this._spinInjected = false;
        }

        // ---- 計画（スポーン時だけ） ----
        if (!this._plannedThisPiece) {
        this._plannedThisPiece = true;
        this.queue = this._planForPiece(g) || [];
        }

        // 待機中は無操作
        if (this.queue.length === 0) { this._watchStuck(g); return; }

        // 1tick=1入力
        this._emit(this.queue.shift());
        this._watchStuck(g);
    }

    // 実行（回転キー）
    _emit(act){
        const g = this.game;
        if (!g?.handleKey) return;
        if (act === "ROT_CW")       g.handleKey("rotateRight");
        else if (act === "ROT_CCW") g.handleKey("rotateLeft");
        else                        g.handleKey(act);
    }

    // 詰まり監視＆保険
    _watchStuck(g){
        const m = g.currentMino; if(!m) return;
        const sig = `${m.x}:${m.y}`;
        if (sig === this._stuckSig) this._stuckTicks++; else { this._stuckSig=sig; this._stuckTicks=0; }
        if (this.queue.length===0 && !this._spinInjected && this._stuckTicks>=5) {
        this._spinInjected = true; this.queue.unshift("ROT_CW");
        }
    }

    // ====== ここがHoldの要：NoHold vs Hold をスポーン時だけ比較 ======
    _planForPiece(g){
        const noHoldPlan = this._planOnce(g.field, cloneMino(g.currentMino), /*allowNearSpin:*/true);
        let best = noHoldPlan ? { ...noHoldPlan, exec: noHoldPlan.exec.slice(0), score: noHoldPlan.score } : null;

        // Hold候補（canHold のときだけ）
        const canHold = (typeof g.canHold==="boolean") ? g.canHold : true;
        if (canHold) {
        const held = g.holdMino ? cloneMino(g.holdMino) : null;
        const nextHead = g.nextQueue && g.nextQueue[0] ? cloneMino(g.nextQueue[0]) : null;

        // Hold後に出るミノ
        let spawnMin = null;
        if (held) spawnMin = this._spawnFromType(held.type);
        else if (nextHead) spawnMin = this._spawnFromType(nextHead.type);

        if (spawnMin) {
            const allowNear = (spawnMin.type==="T") ? NEAR_SPIN_FOR_T : true;
            const hp = this._planOnce(g.field, spawnMin, allowNear);
            if (hp) {
            const hpScore = hp.score - HOLD_COST; // 少しだけコスト
            if (!best || hpScore > best.score) {
                best = { exec: ["hold", ...hp.exec], score: hpScore };
            }
            }
        }
        }
        return best ? best.exec : null;
    }

    // スポーン用：core の形状に合わせて初期位置のミノを作成
    _spawnFromType(type){
        const rot=0, x=3, y=0;
        const blocks = (MINOS[type] && MINOS[type][rot]) ? MINOS[type][rot] : [];
        return { type, rotation: rot, x, y, blocks, color: "#fff" };
    }

    // ====== 1回の計画（このミノだけ） ======
    _planOnce(field, m0, allowNearSpin){
        const routes = [];
        for(let rGoal=0;rGoal<4;rGoal++){
        const rotSeq = this._rotSeq((m0.rotation||0)%4, rGoal);
        for(let targetX=-2; targetX<12; targetX++){
            const r1 = this._tryRoute(field, m0, { rotFirst:true,  targetX, rotSeq, nearSpin:false });
            if (r1) routes.push(r1);
            const r2 = this._tryRoute(field, m0, { rotFirst:false, targetX, rotSeq, nearSpin:false });
            if (r2) routes.push(r2);
            if (allowNearSpin){
            const r3 = this._tryRoute(field, m0, { rotFirst:false, targetX, rotSeq, nearSpin:true  });
            if (r3) routes.push(r3);
            }
        }
        }
        if (routes.length===0) return null;
        routes.sort((a,b)=> b.score - a.score);
        return routes[0];
    }

    _tryRoute(field, m0, { rotFirst, targetX, rotSeq, nearSpin }){
        let m = cloneMino(m0);

        if (rotFirst) {
        if(!this._applyRotSeqDry(m, rotSeq, field)) return null;
        const moves = this._hMoves(m.x, targetX);
        if(!this._applyMovesDry(m, moves, field)) return null;
        } else {
        const moves = this._hMoves(m.x, targetX);
        if(!this._applyMovesDry(m, moves, field)) return null;

        if (nearSpin) {
            // 着地寸前で回転
            const dropY = this._dropTo(field, m); if (dropY===null) return null;
            const tries = [dropY-1, dropY-2, m.y];
            let spun=false;
            for (const yTry of tries){
            const tmp = cloneMino(m); tmp.y = Math.max(m.y, yTry);
            if (this._applyRotSeqDry(tmp, rotSeq, field)) { m=tmp; spun=true; break; }
            }
            if(!spun) return null;
        } else {
            if(!this._applyRotSeqDry(m, rotSeq, field)) return null;
        }
        }

        const landY = this._dropTo(field, m); if (landY===null) return null;

        // 実行列：回転はトークン化（実行時にキーへ）
        const exec=[];
        if (rotFirst) {
        exec.push(...rotSeq.map(d=>d==="CW"?"ROT_CW":"ROT_CCW"));
        exec.push(...this._hMoves(m0.x, targetX));
        } else {
        exec.push(...this._hMoves(m0.x, targetX));
        exec.push(...rotSeq.map(d=>d==="CW"?"ROT_CW":"ROT_CCW"));
        }
        exec.push("hardDrop");

        const score = this._scoreAfterPlace_NoTSpin(field, { ...m, y:landY });
        return { exec, score };
    }

    _hMoves(x0,x1){ const dx=x1-x0; return dx>0? Array(dx).fill("moveRight") : Array(-dx).fill("moveLeft"); }

    // --- 乾式回転：core の rotateMino に丸乗せ（SRS/キック完全一致） ---
    _applyRotSeqDry(m, seq, field){
        for(const step of seq){
        const dir = step==="CW" ? "right" : "left";
        const rr  = rotateMino(m, dir, field, (f,mm)=>checkCollision(f,mm));
        if (!rr || rr.kickIndex === -1) return false;
        m = rr.mino; // coreが {type,rotation,x,y,blocks} を更新
        }
        Object.assign(arguments[0], m);
        return true;
    }

    _applyMovesDry(m, moves, field){
        for(const mv of moves){
        const dx = (mv==="moveRight") ? +1 : -1;
        const cand = { ...m, x: m.x + dx };
        if (checkCollision(field, cand)) return false;
        m.x += dx;
        }
        return true;
    }

    _dropTo(field,m){ let y=m.y; while(!checkCollision(field,{...m,y:y+1})) y++; return y; }

    // --- 評価：T-Spinは一旦OFF（安定優先）。行消し＋整地のみ ---
    _scoreAfterPlace_NoTSpin(field, placed){
        const grid = field.map(r=>r.slice());
        placeMino(grid, placed);

        let cleared=0;
        for(let y=grid.length-1;y>=0;y--){
        if(grid[y].every(c=>c)){ cleared++; grid.splice(y,1); grid.unshift(new Array(10).fill(null)); y++; }
        }

        const heights=new Array(10).fill(0), holes=new Array(10).fill(0);
        for(let x=0;x<10;x++){
        let seen=false;
        for(let y=0;y<20;y++){
            if(grid[y][x]){ if(!seen){ heights[x]=20-y; seen=true; } }
            else if(seen){ holes[x]++; }
        }
        }
        let bump=0; for(let x=0;x<9;x++) bump+=Math.abs(heights[x]-heights[x+1]);
        const heightSum=heights.reduce((a,b)=>a+b,0), holeSum=holes.reduce((a,b)=>a+b,0);

        let s=0;
        s -= heightSum*1.15;
        s -= holeSum  *16.0;
        s -= bump     * 4.0;

        const clearPts=[0,220,380,600,950];
        s += clearPts[Math.min(4,cleared)];

        return s;
    }

    // --- 最短回転列（CW/CCW を埋める） ---
    _rotSeq(cur, goal){
        const cw  = (goal - cur + 4) % 4;
        const ccw = (cur - goal + 4) % 4;
        const useCW = cw <= ccw;
        const n = useCW ? cw : ccw;
        return Array(n).fill(useCW ? "CW" : "CCW");
    }
}