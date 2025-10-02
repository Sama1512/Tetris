/** ガチ対戦マネージャ：ガベージ送受信・勝敗・演出 */
export class VersusManager {
    constructor(player, cpu, ui) {
        this.player = player;
        this.cpu = cpu;
        this.ui = ui;

        this.pending = { player: 0, cpu: 0 }; // 未適用ガベージ（相殺前）
        this.alive = { player: true, cpu: true };

        // Hook line clear events
        player.onClear = (lines, info) => this.onClear('player', lines, info);
        cpu.onClear    = (lines, info) => this.onClear('cpu',    lines, info);

        player.onGameOver = () => this.onTopOut('player');
        cpu.onGameOver    = () => this.onTopOut('cpu');
    }

    onClear(side, lines, info) {
        // 攻撃量を計算 → まず自分への被弾（pending[oppo]）を相殺 → 余剰があれば相手にキュー
        const atk = this.calcAttack(lines, info);
        const opp = side === 'player' ? 'cpu' : 'player';

        // 相殺
        const cancel = Math.min(atk, this.pending[side]);
        this.pending[side] -= cancel;
        const remain = atk - cancel;

        if (remain > 0) this.pending[opp] += remain;

        // ちょっと演出
        this.flashAxis();
        this.updateNameplates();
    }

    applyPending(side) {
        const n = this.pending[side];
        if (n <= 0) return;
        this.pending[side] = 0;
        const game = side === 'player' ? this.player : this.cpu;
        this.injectGarbage(game, n);
    }

    injectGarbage(game, n) {
        const grid = game.field;
        const W = grid[0].length, H = grid.length;
        for (let k=0;k<n;k++) {
        // 最下段に穴1つのゴミを追加、全体を上に1段ずらす
        grid.shift();
        const hole = Math.floor(Math.random()*W);
        const row = new Array(W).fill({color:"#777"});
        row[hole] = null;
        grid.push(row);
        }
        game.render();
    }

    onTopOut(side) {
        this.alive[side] = false;
        const opp = side === 'player' ? 'cpu' : 'player';
        // 同時撃墜？
        if (!this.alive[opp]) return this.showResult('DRAW', '相打ち！');
        // 片方だけ死んだ
        return this.showResult(opp === 'player' ? 'PLAYER WIN' : 'CPU WIN', opp === 'player' ? 'お見事！' : 'ぐぬぬ…');
    }

    showResult(title, subtitle) {
        const box = document.getElementById('result-box');
        if (!box) return;
        box.style.display = 'block';
        box.querySelector('.result-message').textContent = title + (subtitle ? ' - ' + subtitle : '');
    }

    flashAxis() {
        const axis = document.getElementById('axis-line');
        if (!axis) return;
        axis.classList.add('garbage-flash');
        setTimeout(()=>axis.classList.remove('garbage-flash'), 200);
    }

    updateNameplates() {
        const l = document.getElementById('name-player');
        const r = document.getElementById('name-cpu');
        if (!l || !r) return;
        l.textContent = `PLAYER  (←${this.pending.player})`;
        r.textContent = `CPU  (←${this.pending.cpu})`;
    }

    // 典型的攻撃テーブル（簡易）
    calcAttack(lines, { type, b2b, combo, perfectClear }) {
        let atk = 0;
        const b2bActive = (b2b||0) > 0;
        if (type === 'tspin') {
        if (lines === 1) atk = 2;
        else if (lines === 2) atk = 4;
        else if (lines === 3) atk = 6;
        } else if (type === 'tspin-mini') {
        if (lines === 1) atk = 1;
        } else {
        if (lines === 2) atk = 1;
        else if (lines === 3) atk = 2;
        else if (lines === 4) atk = 4; // TETRIS
        }
        if (b2bActive && atk > 0) atk += 1;
        if (perfectClear) atk += 6;
        // ざっくりREN加算（2から加点）
        if ((combo||-1) >= 1) atk += Math.min(5, Math.floor((combo)/2)+1);
        return atk;
    }
}