// theme.js：テーマ適用時に settings 全体を上書きしない（テーマだけマージ保存）

export function applyTheme(name) {
    // 1) 見た目だけ即反映
    try { document.documentElement.setAttribute('data-theme', name); } catch {}
    // 2) 互換：flatキーも更新
    try { localStorage.setItem('theme', name); } catch {}
    // 3) JSON は “マージ” で反映（他キーを潰さない）
    try {
    const cur = JSON.parse(localStorage.getItem('settings') || '{}');
    const next = { ...cur, theme: name, _meta:{ v:(cur._meta?.v|0)+1, updatedAt: Date.now(), source: 'theme' } };
    localStorage.setItem('settings', JSON.stringify(next));
    } catch {}
}

export function loadThemeFromSettings() {
    try {
        const s = JSON.parse(localStorage.getItem('settings') || '{}');
        const name = s.theme || localStorage.getItem('theme') || 'neo';
        applyTheme(name);
    } catch {
        applyTheme(localStorage.getItem('theme') || 'neo');
    }
}