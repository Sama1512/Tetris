import { applyTheme, loadThemeFromSettings } from "./theme.js";

const DEF = {
  "show-ghost": true, "enable-hold": true, "enable-harddrop": true,
  "reverse-rotation": false, "next-count": 5,
  "das": 133, "arr": 0,
  "lock-delay": 500, "lock-resets": 15, "lock-reset-policy": "move",
  // ★テーマ／音／演出
  "theme": "neo",
  "mute": false,
  "sfx-volume": 0.6,          // 0..1
  "effects-enabled": true,
  "effects-badge-scale": 1.35,
  "combo-label": "REN",
  "show-time": true
};

export async function getSettings() {
  // localStorage 優先 → なければ config/settings.json → 既定
  let s = {};
  try { s = JSON.parse(localStorage.getItem("settings") || "{}"); } catch {}
  if (!Object.keys(s).length) {
    try {
      const r = await fetch("/config/settings.json", { cache:"no-store" });
      if (r.ok) s = await r.json();
    } catch {}
  }
  return { ...DEF, ...s };
}

export async function initSettingsUI() {
  const s = await getSettings();
  // ===== テーマ =====
  bindSelect("theme-select", s.theme, v => {
    s.theme = v; save(s); applyTheme(v);
  });

  // ===== 音 =====
  bindCheckbox("sfx-mute", !!s.mute, v => { s.mute = v; save(s); });
  bindRange("sfx-volume", Math.round((s["sfx-volume"] ?? 0.6)*100), v => {
    s["sfx-volume"] = Math.max(0,Math.min(1, v/100)); save(s);
  }, v => `${v}%`);

  // ===== 演出 =====
  bindCheckbox("effects-enabled", !!s["effects-enabled"], v => { s["effects-enabled"]=v; save(s); });
  bindRange("effects-badge-scale", (s["effects-badge-scale"] ?? 1.35), v => {
    const num = Number(v); s["effects-badge-scale"] = (Number.isFinite(num)? num : 1.35); save(s);
  }, v => `${v}x`);
  bindInput("combo-label", s["combo-label"] ?? "REN", v => { s["combo-label"] = v || "REN"; save(s); });

  // ===== 既存（参考：もし設定画面に項目があれば同じ関数で縛れる） =====
  // bindCheckbox("show-ghost", s["show-ghost"], v=>{ s["show-ghost"]=v; save(s); });
  // bindCheckbox("enable-hold", s["enable-hold"], v=>{ s["enable-hold"]=v; save(s); });
  // bindCheckbox("enable-harddrop", s["enable-harddrop"], v=>{ s["enable-harddrop"]=v; save(s); });
  // bindCheckbox("reverse-rotation", s["reverse-rotation"], v=>{ s["reverse-rotation"]=v; save(s); });
  // bindRange("next-count", s["next-count"], v=>{ s["next-count"]=Number(v)|0; save(s); });
  // bindRange("das", s["das"], v=>{ s["das"]=Number(v)|0; save(s); });
  // bindRange("arr", s["arr"], v=>{ s["arr"]=Number(v)|0; save(s); });
  // bindRange("lock-delay", s["lock-delay"], v=>{ s["lock-delay"]=Number(v)|0; save(s); });
  // bindRange("lock-resets", s["lock-resets"], v=>{ s["lock-resets"]=Number(v)|0; save(s); });
  // bindSelect("lock-reset-policy", s["lock-reset-policy"], v=>{ s["lock-reset-policy"]=v; save(s); });

  // 初期表示でテーマを適用
  loadThemeFromSettings();
}

/* ===== 小物バインダ群 ===== */
function $(id){ return document.getElementById(id); }
function save(s){ try{ localStorage.setItem("settings", JSON.stringify(s)); }catch{} }
function bindCheckbox(id, val, onChange){
  const el = $(id); if (!el) return; el.checked = !!val;
  el.addEventListener("change", ()=> onChange(!!el.checked));
}
function bindInput(id, val, onChange){
  const el = $(id); if (!el) return; el.value = val ?? "";
  el.addEventListener("input", ()=> onChange(el.value));
}
function bindSelect(id, val, onChange){
  const el = $(id); if (!el) return; el.value = val ?? "";
  el.addEventListener("change", ()=> onChange(el.value));
}
function bindRange(id, val, onChange, fmt=(v)=>v){
  const el = $(id), out = $(`${id}-out`);
  if (!el) return;
  el.value = val; if (out) out.textContent = fmt(el.value);
  el.addEventListener("input", ()=>{ onChange(el.value); if(out) out.textContent = fmt(el.value); });
}