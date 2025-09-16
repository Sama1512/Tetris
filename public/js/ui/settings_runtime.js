
// ランタイムで設定値を読むための薄いユーティリティ
// localStorage を優先し、未保存なら config/settings.json をfallbackにする
const DEFAULTS_URL = "../../../config/settings.json";

let _defaultsCache = null;

async function loadDefaults() {
  if (_defaultsCache) return _defaultsCache;
  try {
    const res = await fetch(DEFAULTS_URL);
    _defaultsCache = await res.json();
  } catch (e) {
    console.error("設定デフォルトの読み込みに失敗:", e);
    _defaultsCache = {};
  }
  return _defaultsCache;
}

export async function getSettings() {
  const def = await loadDefaults();
  // localStorage は string なので必要なら型を揃える
  const getBool = (k) => {
    const v = localStorage.getItem(k);
    if (v === null || v === undefined) return !!def[k];
    return v === "true" || v === true;
  };
  const getNum = (k) => {
    const v = localStorage.getItem(k);
    if (v === null || v === undefined) return Number(def[k] ?? 0);
    const n = Number(v);
    return Number.isFinite(n) ? n : Number(def[k] ?? 0);
  };

  return {
    "show-ghost": getBool("show-ghost"),
    "enable-hold": getBool("enable-hold"),
    "show-time": getBool("show-time"),
    "enable-harddrop": getBool("enable-harddrop"),
    "reverse-rotation": getBool("reverse-rotation"),
    "next-count": getNum("next-count"),
    "das": getNum("das"),
    "arr": getNum("arr"),
    "lock-delay": getNum("lock-delay"),
  };
}

export async function getSetting(key) {
  const all = await getSettings();
  return all[key];
}
