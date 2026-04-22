// public/js/ui/sound.js
// Web Audio サウンド管理：初回操作でresume、404は静音ビープにフォールバック。
// 相対/絶対どっちのパスでも探す。

function clamp01(v){ return Math.max(0, Math.min(1, Number(v)||0)); }
function isAbs(u){ return /^https?:\/\//.test(u) || u.startsWith("/"); }

export class Sound {
    constructor() {
        this.ctx = null;
        this.buffers = new Map(); // key:url -> AudioBuffer|null
        this.muted = false;
        this.volume = 0.6;
        this.bgmMuted = false;
        this.bgmVolume = 0.4;
        this._bgm = null;
        this._unlocked = false;

        this.sfx = {
        move:   "move.mp3",
        rotate: "rotate.mp3",
        hard:   "harddrop.mp3",
        hold:   "hold.mp3",
        clear1: "clear1.mp3",
        tetris: "tetris.mp3",
        tspin:  "tspin.mp3",
        pc:     "allclear.mp3",
        level:  "levelup.mp3",
        };
        this.bgmTracks = { Korobeiniki8bit: "Korobeiniki8bit.m4a" };

        try {
        const s = JSON.parse(localStorage.getItem("settings")||"{}");
        if (typeof s.mute==="boolean") this.muted = s.mute;
        if (Number.isFinite(s["sfx-volume"])) this.volume = clamp01(s["sfx-volume"]);
        if (typeof s["bgm-mute"]==="boolean") this.bgmMuted = s["bgm-mute"];
        if (Number.isFinite(s["bgm-volume"])) this.bgmVolume = clamp01(s["bgm-volume"]);
        } catch {}

        // 既定で仕込んどく（あとから手動で呼ばれてもOK）
        this._attachUnlock();
    }

    /** ←★ ゲーム側との互換のため公開メソッドを用意（SingleGameBaseが呼ぶ） */
    attachUnlock(){ this._attachUnlock(); }

    _attachUnlock() {
        if (this._unlockBound) return; // 多重登録防止
        const unlock = async () => {
        if (!this.ctx) this.ctx = this._createCtx();
        try { await this.ctx?.resume?.(); } catch {}
        this._unlocked = true;
        window.removeEventListener("pointerdown", unlock);
        window.removeEventListener("keydown", unlock);
        window.removeEventListener("touchstart", unlock);
        };
        this._unlockBound = true;
        window.addEventListener("pointerdown", unlock, { once:true });
        window.addEventListener("keydown", unlock, { once:true });
        window.addEventListener("touchstart", unlock, { once:true });
    }

    _createCtx() {
        try { return new (window.AudioContext||window.webkitAudioContext)(); }
        catch(e){ console.warn("[SOUND] AudioContext create failed", e); return null; }
    }
    async _ensureCtx(){
        if (!this._unlocked) return null;           // ユーザー操作までサイレント
        if (!this.ctx) this.ctx = this._createCtx();
        try { await this.ctx?.resume?.(); } catch {}
        return this.ctx;
    }

    _bases(){
        return [
        "../../assets/sounds/",
        "../assets/sounds/",
        "assets/sounds/",
        "/assets/sounds/",
        ];
    }
    async _loadBuf(file, keyPrefix){
        const ctx = await this._ensureCtx(); if (!ctx) return null;
        const candidates = isAbs(file) ? [file] : this._bases().map(b=>b+file);
        for (const url of candidates) {
        const key = keyPrefix+url;
        if (this.buffers.has(key)) return this.buffers.get(key);
        try {
            const res = await fetch(url, { cache:"force-cache" });
            if (!res.ok) throw new Error(String(res.status));
            const ab  = await res.arrayBuffer();
            const buf = await ctx.decodeAudioData(ab.slice(0));
            this.buffers.set(key, buf);
            return buf;
        } catch {
            this.buffers.set(key, null);
        }
        }
        return null;
    }

    async play(name, { rate=1.0, volume=this.volume } = {}) {
        if (this.muted) return;
        const ctx = await this._ensureCtx(); if (!ctx) return;

        const file = this.sfx[name] || name; // 直URLもOK
        const buf  = await this._loadBuf(file, "sfx:");
        if (buf) {
        const src=ctx.createBufferSource(); src.buffer=buf; src.playbackRate.value=rate;
        const gain=ctx.createGain(); gain.gain.value = clamp01(volume);
        src.connect(gain).connect(ctx.destination);
        try { src.start(); } catch {}
        return;
        }

        // 404等は短いビープにフォールバック
        const osc = ctx.createOscillator(), gain=ctx.createGain(), now=ctx.currentTime;
        const table = { move:440, rotate:660, hard:880, hold:520, clear1:600, tetris:420, tspin:700, pc:940, level:500 };
        osc.type="triangle"; osc.frequency.value = table[name] || 500;
        gain.gain.value = clamp01(volume)*0.3; gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
        osc.connect(gain).connect(ctx.destination);
        try { osc.start(now); osc.stop(now + 0.09); } catch {}
    }

    async playBGM(track="Korobeiniki8bit"){
        if (this.bgmMuted) return;
        const ctx = await this._ensureCtx(); if (!ctx) return;
        const file = this.bgmTracks[track] || track;
        const buf  = await this._loadBuf(file, "bgm:");
        if (!buf) return;

        this.stopBGM();
        const src=ctx.createBufferSource(); src.buffer=buf; src.loop=true;
        const gain=ctx.createGain(); gain.gain.value = clamp01(this.bgmVolume);
        src.connect(gain).connect(ctx.destination);
        try { src.start(); } catch {}
        this._bgm = { src, gain };
    }

    stopBGM(){ try { this._bgm?.src.stop(); } catch {} this._bgm=null; }
    setMute(m){ this.muted=!!m; }
    setVolume(v){ this.volume=clamp01(v); }
    setBgmMute(m){ this.bgmMuted=!!m; if (this.bgmMuted) this.stopBGM(); }
    setBgmVolume(v){ this.bgmVolume=clamp01(v); if (this._bgm) this._bgm.gain.gain.value = clamp01(this.bgmVolume); }
}

export const sound = new Sound();