// settings.js：タブはhidden切替／JSON⇄flat自己修復／テーマ・音・表示・操作の自動保存を委任で一元化
console.info("[settings] script loaded");

/* ===== 動的テーマ（失敗しても落ちない） ===== */
let applyTheme = () => {};
let loadThemeFromSettings = () => {};
(async () => {
  try {
    const mod = await import("../ui/theme.js");
    applyTheme = mod.applyTheme || applyTheme;
    loadThemeFromSettings = mod.loadThemeFromSettings || loadThemeFromSettings;
    console.info("[settings] theme loaded: ../ui/theme.js");
    // 読み込み後に一度上書き（保険）
    paintFrom(current());
  } catch { console.warn("[settings] theme.js missing (skip)"); }
})();

/* ===== 既定値 ===== */
const DEF = {
  // 表示
  "show-ghost": true,
  "show-time":  true,
  "next-count": 5,
  // 操作
  "enable-harddrop": true,
  "enable-hold":     true,
  "reverse-rotation": false,
  "das": 100,
  "arr": 33,
  "lock-delay": 500,
  "lock-resets": 15,
  "lock-reset-policy": "move",
  // テーマ/音/演出
  "theme": "neo",
  "mute": false,
  "sfx-volume": 0.6,              // 0..1 で保存（UIは 0..100 ）
  "effects-enabled": true,
  "effects-badge-scale": 1.35,
  "combo-label": "REN",
  // メタ（任意）
  "_meta": { v: 0, updatedAt: 0, source: "default" }
};

/* ===== キー既定（存在すれば使う） ===== */
const KEY_DEF = {
  moveLeft:"ArrowLeft", moveRight:"ArrowRight", softDrop:"ArrowDown", hardDrop:"ArrowUp",
  rotateLeft:"KeyZ", rotateRight:"KeyX", hold:"KeyC", pause:"KeyP",
};

/* ===== util ===== */
const $  = id  => document.getElementById(id);
const $$ = sel => Array.from(document.querySelectorAll(sel));
const clampInt = (v,min,max,def)=>{ const n=Number(v); if(!Number.isFinite(n)) return def; return Math.max(min,Math.min(max,Math.trunc(n))); };
const clamp01  = (v,def)=>{ const n=Number(v); if(!Number.isFinite(n)) return def; return Math.max(0,Math.min(1,n)); };

/* ===== トースト（最前面） ===== */
function toastBox(id,bg){
  let box=document.getElementById(id);
  if(!box){
    box=document.createElement("div"); box.id=id;
    Object.assign(box.style,{
      position:"fixed", left:"50%", bottom:"24px", transform:"translateX(-50%) translateY(8px)",
      minWidth:"220px", maxWidth:"min(90vw,560px)", padding:"10px 14px", borderRadius:"10px",
      font:"700 14px/1.3 system-ui,-apple-system,'Noto Sans JP',sans-serif",
      textAlign:"center", color:"#fff", boxShadow:"0 10px 30px rgba(0,0,0,.35)",
      opacity:"0", pointerEvents:"none", zIndex:"2147483647",
      transition:"opacity .18s ease, transform .18s ease", background:bg
    });
    document.body.appendChild(box);
  }
  return box;
}
function showToast(text, ok=true){
  const box=toastBox("message-box-toast", ok?"linear-gradient(135deg,#00c853,#00bfa5)":"linear-gradient(135deg,#e53935,#b71c1c)");
  box.textContent=text;
  requestAnimationFrame(()=>{ box.style.opacity="1"; box.style.transform="translateX(-50%) translateY(0)";
    setTimeout(()=>{ box.style.opacity="0"; box.style.transform="translateX(-50%) translateY(8px)"; },1200);
  });
}
function showToastManual(text){
  const box=toastBox("message-box-toast-manual","linear-gradient(135deg,#00c853,#00bfa5)");
  box.textContent=text;
  requestAnimationFrame(()=>{ box.style.opacity="1"; box.style.transform="translateX(-50%) translateY(0)";
    setTimeout(()=>{ box.style.opacity="0"; box.style.transform="translateX(-50%) translateY(8px)"; },1200);
  });
}

/* ===== storage I/O（JSON 最優先＋flat 救済） ===== */
function readFlat(){
  const out={}; Object.keys(DEF).forEach(k=>{
    const v=localStorage.getItem(k); if(v===null) return;
    if(typeof DEF[k]==="boolean") out[k]=(v==="true");
    else if(typeof DEF[k]==="number") out[k]=Number(v);
    else out[k]=v;
  }); return out;
}
function readJSON(){ try{ return JSON.parse(localStorage.getItem("settings")||"{}"); }catch{ return {}; } }
function writeFlatAll(obj){
  Object.keys(DEF).forEach(k=>{
    if(!(k in obj)) return;
    const v=obj[k];
    if(typeof DEF[k]==="boolean") localStorage.setItem(k, v?"true":"false");
    else localStorage.setItem(k, String(v));
  });
}
function mergeSettings(){
  const json=readJSON(), flat=readFlat();
  const merged={...DEF, ...flat, ...json};
  const numPick = (k, def) => Number.isFinite(flat[k]) ? flat[k] : (Number.isFinite(json[k]) ? json[k] : def);
  merged["sfx-volume"]          = clamp01(numPick("sfx-volume", DEF["sfx-volume"]), DEF["sfx-volume"]);
  merged["effects-badge-scale"] = numPick("effects-badge-scale", DEF["effects-badge-scale"]);
  merged["theme"]               = (json.theme ?? flat.theme ?? DEF.theme);
  merged._meta = { v:(json._meta?.v|0), updatedAt:(json._meta?.updatedAt|0), source:"merge" };
  return merged;
}
/** 起動時に JSON⇄flat を自己修復して整合を取る */
function unifySettings(){
  const u=mergeSettings();
  localStorage.setItem("settings", JSON.stringify(u));
  writeFlatAll(u);
  return u;
}
/** 保存はこの入口だけ：必ず JSON + flat の両方に反映 */
function commit(patch, source="ui"){
  const cur = mergeSettings();
  const next = { ...cur, ...patch, _meta:{ v:(cur._meta?.v|0)+1, updatedAt:Date.now(), source } };
  localStorage.setItem("settings", JSON.stringify(next));
  writeFlatAll(next);
  return next;
}
function current(){ return mergeSettings(); }

/* ===== DOM同期ヘルパ ===== */
function syncToggle(id,val){ const el=$(id); if(el){ el.checked=!!val; el.setAttribute("aria-checked", el.checked?"true":"false"); } }
function setNumber(id,val){ const el=$(id); if(el) el.value = (val ?? ""); }
function codeToLabel(code){ const m={ArrowLeft:"←",ArrowRight:"→",ArrowUp:"↑",ArrowDown:"↓",Space:"␣",Enter:"⏎",Escape:"Esc"}; if(m[code])return m[code]; if(code?.startsWith?.("Key"))return code.slice(3); if(code?.startsWith?.("Digit"))return code.slice(5); return code||""; }
function setKey(action, code){
  const el=$(`key-${action}`); if(!el) return;
  if(el.dataset.bound==="1"){ el.value=codeToLabel(code||""); return; }
  el.value=codeToLabel(code||""); el.dataset.action=action;
  el.addEventListener("keydown", e=>{
    e.preventDefault(); e.stopPropagation();
    if(e.key==="Escape"){ el.value=""; persistKey(action,""); showToast("キー設定をクリアしました", true); return; }
    const c=e.code||e.key; el.value=codeToLabel(c); persistKey(action,c); showToast("キー設定を更新しました", true);
  });
  el.addEventListener("beforeinput", e=> e.preventDefault());
  el.dataset.bound="1";
}
function persistKey(action,code){
  let kb={}; try{ kb=JSON.parse(localStorage.getItem("keyBindings")||"{}")||{}; }catch{}
  kb[action]=code; localStorage.setItem("keyBindings", JSON.stringify(kb));
}

/* ===== タブ切替（hidden で確実に切替） ===== */
function showTab(name){
  document.querySelectorAll('.tab-button').forEach(btn=>{
    btn.classList.toggle('active', btn.dataset.tab === name);
  });
  document.querySelectorAll('.tab-content').forEach(p=>{
    p.hidden = true; p.classList.remove('active');
  });
  const panel = document.getElementById(`tab-${name}`);
  if (panel){ panel.hidden = false; panel.classList.add('active'); }
  try{ history.replaceState(null,"",`#tab=${name}`); }catch{}
  // タブを開いた瞬間、保存値で上書き・委任バインド有効化
  if (name === 'theme')    { paintFrom(current()); bindThemeAutosaveDelegated(); }
  if (name === 'display')  { bindDisplayAutosaveDelegated(); }
  if (name === 'control')  { bindControlAutosaveDelegated(); }
}

/* ===== 描画（唯一の描画口） ===== */
function paintFrom(s){
  // キー（あれば）
  const kb=(()=>{ try{ return { ...KEY_DEF, ...(JSON.parse(localStorage.getItem("keyBindings")||"{}")||{}) }; }catch{ return {...KEY_DEF}; } })();
  setKey("moveLeft",kb.moveLeft); setKey("moveRight",kb.moveRight);
  setKey("softDrop",kb.softDrop); setKey("hardDrop",kb.hardDrop);
  setKey("rotateLeft",kb.rotateLeft); setKey("rotateRight",kb.rotateRight);
  setKey("hold",kb.hold); setKey("pause",kb.pause);

  // 表示
  setNumber("next-count", s["next-count"]);
  syncToggle("toggle-ghost", !!s["show-ghost"]);
  syncToggle("toggle-time",  !!s["show-time"]);

  // 操作
  syncToggle("toggle-harddrop",  !!s["enable-harddrop"]);
  syncToggle("toggle-hold",      !!s["enable-hold"]);
  syncToggle("reverse-rotation", !!s["reverse-rotation"]);
  setNumber("das", s["das"]); setNumber("arr", s["arr"]); setNumber("lock-delay", s["lock-delay"]);

  // テーマ/音/演出（今→rAF→microtask の三段同期）
  const paintTheme = () => {
    const sel = $("#theme-select"); if (sel) sel.value = s.theme || "neo";
    syncToggle("sfx-mute", !!s.mute);

    const volEl = $("#sfx-volume");
    if (volEl) {
      volEl.value = String(Math.round(100 * (s["sfx-volume"] ?? DEF["sfx-volume"]))); // 0..100
      const out=$("#sfx-volume-out"); if(out) out.textContent = `${volEl.value}%`;
    }
    syncToggle("effects-enabled", !!s["effects-enabled"]);

    const badgeEl = $("#effects-badge-scale");
    if (badgeEl) {
      badgeEl.value = String(s["effects-badge-scale"] ?? DEF["effects-badge-scale"]);
      const out=$("#effects-badge-scale-out"); if(out) out.textContent = `${badgeEl.value}x`;
    }
    // ★① 連続表示ラベル：必ず“現値”を入力欄に復元
    const combo = $("#combo-label");
    if (combo) combo.value = (s["combo-label"] ?? DEF["combo-label"]) || DEF["combo-label"];
  };
  paintTheme(); requestAnimationFrame(paintTheme); Promise.resolve().then(paintTheme);
}

/* ===== 委任オートセーブ：テーマ/音（#tab-theme） ===== */
function bindThemeAutosaveDelegated(){
  const host = document.getElementById('tab-theme');
  if (!host || host.dataset.delegated === '1') return;

  const DEF_SMALL = { "sfx-volume":0.6, "effects-badge-scale":1.35, "combo-label":"REN" };

  function commitPatch(patch){
    const cur = readJSON();
    const next = { ...cur, ...patch, _meta:{ v:(cur._meta?.v|0)+1, updatedAt:Date.now(), source:'delegated:theme' } };
    localStorage.setItem('settings', JSON.stringify(next));
    Object.keys(patch).forEach(k=>{
      const v = next[k];
      if (typeof DEF[k]==="boolean") localStorage.setItem(k, v ? "true" : "false");
      else localStorage.setItem(k, String(v));
    });
  }

  function handler(e){
    const t = e.target, id = t && t.id; if (!id) return;
    let patch=null;
    if (id==='theme-select'){
      patch = { theme: t.value || 'neo' };
    } else if (id==='sfx-mute'){
      patch = { mute: !!t.checked };
    } else if (id==='sfx-volume'){
      const raw = Number(t.value), cur = readJSON();
      const v01 = Number.isFinite(raw) ? clamp01(raw/100, cur['sfx-volume'] ?? DEF_SMALL['sfx-volume'])
                                       : (cur['sfx-volume'] ?? DEF_SMALL['sfx-volume']);
      const out=$("#sfx-volume-out"); if(out) out.textContent = `${t.value}%`;
      patch = { 'sfx-volume': v01 };
    } else if (id==='effects-enabled'){
      patch = { 'effects-enabled': !!t.checked };
    } else if (id==='effects-badge-scale'){
      const raw = Number(t.value), cur = readJSON();
      const v = Number.isFinite(raw) ? raw : (cur['effects-badge-scale'] ?? DEF_SMALL['effects-badge-scale']);
      const out=$("#effects-badge-scale-out"); if(out) out.textContent = `${t.value}x`;
      patch = { 'effects-badge-scale': v };
    } else if (id==='combo-label'){
      const cur = readJSON();
      const txt = String(t.value ?? '').trim() || (cur['combo-label'] ?? DEF_SMALL['combo-label']);
      patch = { 'combo-label': txt };
    }
    if (patch){
      commitPatch(patch);
      if ('theme' in patch) try{ applyTheme(patch.theme); }catch{}
      try{ showToast('自動保存しました', true); }catch{}
    }
  }

  host.addEventListener('change', handler, true);
  host.addEventListener('input',  handler, true);
  host.dataset.delegated = '1';
  console.info('[delegated] autosave bound on #tab-theme');
}

/* ===== 委任オートセーブ：表示（#tab-display） ===== */
function bindDisplayAutosaveDelegated(){
  const host = document.getElementById('tab-display');
  if (!host || host.dataset.delegated === '1') return;

  function commitPatch(patch){
    const cur = readJSON();
    const next = { ...cur, ...patch, _meta:{ v:(cur._meta?.v|0)+1, updatedAt:Date.now(), source:'delegated:display' } };
    localStorage.setItem('settings', JSON.stringify(next));
    Object.keys(patch).forEach(k=>{
      const v = next[k];
      if (typeof DEF[k]==="boolean") localStorage.setItem(k, v ? "true" : "false");
      else localStorage.setItem(k, String(v));
    });
  }

  function handler(e){
    const t = e.target, id = t && t.id; if (!id) return;
    let patch=null;
    if (id==='next-count'){
      patch = { "next-count": clampInt(t.value, 1, 5, (readJSON()['next-count'] ?? DEF['next-count'])) };
    } else if (id==='toggle-ghost'){
      patch = { "show-ghost": !!t.checked };
    } else if (id==='toggle-time'){
      patch = { "show-time": !!t.checked };
    }
    if (patch){ commitPatch(patch); try{ showToast('自動保存しました', true); }catch{} }
  }

  host.addEventListener('change', handler, true);
  host.addEventListener('input',  handler, true);
  host.dataset.delegated = '1';
  console.info('[delegated] autosave bound on #tab-display');
}

/* ===== 委任オートセーブ：操作（#tab-control） ===== */
function bindControlAutosaveDelegated(){
  const host = document.getElementById('tab-control');
  if (!host || host.dataset.delegated === '1') return;

  function commitPatch(patch){
    const cur = readJSON();
    const next = { ...cur, ...patch, _meta:{ v:(cur._meta?.v|0)+1, updatedAt:Date.now(), source:'delegated:control' } };
    localStorage.setItem('settings', JSON.stringify(next));
    Object.keys(patch).forEach(k=>{
      const v = next[k];
      if (typeof DEF[k]==="boolean") localStorage.setItem(k, v ? "true" : "false");
      else localStorage.setItem(k, String(v));
    });
  }

  function handler(e){
    const t = e.target, id = t && t.id; if (!id) return;
    const cur = readJSON();
    let patch=null;
    if (id==='toggle-harddrop'){
      patch = { "enable-harddrop": !!t.checked };
    } else if (id==='toggle-hold'){
      patch = { "enable-hold": !!t.checked };
    } else if (id==='reverse-rotation'){
      patch = { "reverse-rotation": !!t.checked };
    } else if (id==='das'){
      patch = { "das": clampInt(t.value, 0, 2000, cur['das'] ?? DEF['das']) };
    } else if (id==='arr'){
      patch = { "arr": clampInt(t.value, 0, 2000, cur['arr'] ?? DEF['arr']) };
    } else if (id==='lock-delay'){
      patch = { "lock-delay": clampInt(t.value, 0, 5000, cur['lock-delay'] ?? DEF['lock-delay']) };
    }
    if (patch){ commitPatch(patch); try{ showToast('自動保存しました', true); }catch{} }
  }

  host.addEventListener('change', handler, true);
  host.addEventListener('input',  handler, true);
  host.dataset.delegated = '1';
  console.info('[delegated] autosave bound on #tab-control');
}

/* ===== 保存ボタン（手動保存） ===== */
let manualToastBlockUntil = 0;
function onSave(){
  manualToastBlockUntil = performance.now() + 900; // 自動保存トーストを一時ミュート

  // ★② 現在のタブに存在する要素“だけ”を拾う（他タブの値を誤上書きしない）
  const cur = current();
  const patch = {};

  // 表示タブ
  if ($('#tab-display')) {
    if ($('#next-count'))      patch["next-count"]      = clampInt($('#next-count').value, 1, 5, cur["next-count"]);
    if ($('#toggle-ghost'))    patch["show-ghost"]      = !!$('#toggle-ghost').checked;
    if ($('#toggle-time'))     patch["show-time"]       = !!$('#toggle-time').checked;
  }
  // 操作タブ
  if ($('#tab-control')) {
    if ($('#toggle-harddrop')) patch["enable-harddrop"] = !!$('#toggle-harddrop').checked;
    if ($('#toggle-hold'))     patch["enable-hold"]     = !!$('#toggle-hold').checked;
    if ($('#reverse-rotation'))patch["reverse-rotation"]= !!$('#reverse-rotation').checked;
    if ($('#das'))             patch["das"]             = clampInt($('#das').value, 0, 2000, cur["das"]);
    if ($('#arr'))             patch["arr"]             = clampInt($('#arr').value, 0, 2000, cur["arr"]);
    if ($('#lock-delay'))      patch["lock-delay"]      = clampInt($('#lock-delay').value, 0, 5000, cur["lock-delay"]);
  }
  // テーマ/音タブ
  if ($('#tab-theme')) {
    if ($('#theme-select'))        patch["theme"]               = $('#theme-select').value || cur.theme || "neo";
    if ($('#sfx-mute'))            patch["mute"]                = !!$('#sfx-mute').checked;
    if ($('#sfx-volume'))          patch["sfx-volume"]          = clamp01(Number($('#sfx-volume').value)/100, cur["sfx-volume"]);
    if ($('#effects-enabled'))     patch["effects-enabled"]     = !!$('#effects-enabled').checked;
    if ($('#effects-badge-scale')) patch["effects-badge-scale"] = Number($('#effects-badge-scale').value) || cur["effects-badge-scale"];
    if ($('#combo-label')) {
      const txt = String($('#combo-label').value||"").trim();
      patch["combo-label"] = txt || (cur["combo-label"] ?? DEF["combo-label"]);
    }
  }

  try{
    const saved = commit(patch, "manual");
    applyTheme(saved.theme);
    paintFrom(saved);
    showToastManual("保存しました");
  }catch(e){
    console.error(e); showToast("保存に失敗しました", false);
  }
}

/* ===== 起動：自己修復 → 描画 → 委任オートセーブ → タブ安全化 ===== */
(function boot(){
  try{
    const uni = unifySettings();           // JSON⇄flat 同期
    paintFrom(uni);

    // 委任オートセーブを3タブぶん
    bindThemeAutosaveDelegated();
    bindDisplayAutosaveDelegated();
    bindControlAutosaveDelegated();

    // タブ：hiddenで確実切替（ハッシュ対応）
    (function bindTabsSafe(){
      const buttons = document.querySelectorAll('.tab-button');
      buttons.forEach(btn=>{
        if ('type' in btn) btn.type = 'button';
        btn.addEventListener('click', (e)=>{
          e.preventDefault(); e.stopPropagation();
          showTab(btn.dataset.tab);
        });
      });
      const hashMatch = (location.hash.match(/tab=([a-z]+)/i) || [])[1];
      const initial = hashMatch
        || (document.querySelector('.tab-button.active')?.dataset.tab)
        || 'keys';
      showTab(initial);
    })();

    // ページ復帰・再可視化でも現値で再描画（BFCache/別JS対策）
    window.addEventListener("pageshow", ()=> paintFrom(current()));
    document.addEventListener("visibilitychange", ()=> { if(!document.hidden) paintFrom(current()); });

    // save/back だけ拾う（タブは通す）
    document.addEventListener("click",(e)=>{
      if (e.target.closest?.('.tab-button')) return;
      const save=e.target.closest?.("#save-btn");
      const back=e.target.closest?.("#back-to-title");
      if(save){ e.preventDefault(); e.stopPropagation(); onSave(); }
      if(back){ e.preventDefault(); e.stopPropagation(); location.href="./index.html"; }
    }, { capture:true });

    console.info("[settings] boot complete");
  }catch(e){ console.error("[settings] boot error", e); }
})();