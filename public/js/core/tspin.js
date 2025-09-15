// フェーズ1に“追加”するだけの独立判定モジュール。
// 依存は mino.r / mino.x / mino.y / mino.shape と、盤面 field[][] だけ。

/** Tの中心座標（3x3前提） */
function getCenterOfT(mino) {
    // T は 3x3 形状を前提：中心は (x+1, y+1)
    return { cx: (mino?.x ?? 0) + 1, cy: (mino?.y ?? 0) + 1 };
}

/** 4隅の埋まり数と、向きに応じた“前面2角”の埋まり数を返す */
export function tSpinCornerInfo(mino, fieldBeforeClear) {
    const { cx, cy } = getCenterOfT(mino);
    const W = fieldBeforeClear?.[0]?.length ?? 10;
    const H = fieldBeforeClear?.length ?? 20;

    const corners = [
        [-1, -1], [1, -1],   // TL, TR
        [-1,  1], [1,  1],   // BL, BR
    ];
    let cornersFilled = 0;
    for (const [dx, dy] of corners) {
        const x = cx + dx, y = cy + dy;
        if (x < 0 || x >= W || y < 0 || y >= H) { cornersFilled++; continue; }
        if (fieldBeforeClear[y][x]) cornersFilled++;
    }

    // 向き別の「前面2角」
    const r = (mino?.r ?? 0) % 4;
    let fronts;
    if (r === 0) fronts = [[-1,-1],[ 1,-1]];     // 上向き
    else if (r === 1) fronts = [[ 1,-1],[ 1, 1]]; // 右向き
    else if (r === 2) fronts = [[-1, 1],[ 1, 1]]; // 下向き
    else fronts = [[-1,-1],[-1, 1]];              // 左向き

    let frontFilled = 0;
    for (const [dx, dy] of fronts) {
        const x = cx + dx, y = cy + dy;
        if (x < 0 || x >= W || y < 0 || y >= H) { frontFilled++; continue; }
        if (fieldBeforeClear[y][x]) frontFilled++;
    }

    return { cornersFilled, frontFilled };
}

/**
 * 厳密T-Spin/Mini判定
 * - ラスト操作が回転であること（lastSpin.rotated）
 * - 4隅のうち3つ以上が埋まり → スピン
 * - 行消去 lines に応じて：
 *    0行: tspin-mini
 *    1行: 前面2角(frontFilled)が2なら tspin、それ以外は tspin-mini
 *   2行+: tspin
 * - 条件を満たさなければ "normal"
 */
export function classifyTSpinStrict(mino, fieldBeforeClear, lastSpin, lines) {
    if (!lastSpin?.rotated) return "normal";
    if (mino?.type !== "T") return "normal";

    const { cornersFilled, frontFilled } = tSpinCornerInfo(mino, fieldBeforeClear);
    const isSpin = cornersFilled >= 3;
    if (!isSpin) return "normal";

    if (lines === 0) return "tspin-mini";
    if (lines === 1) return (frontFilled === 2) ? "tspin" : "tspin-mini";
    return "tspin";
}