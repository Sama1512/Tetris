// 厳密T-Spin/Mini 判定ロジック（mino.js に依存しない自己完結版）

const isTPiece = (mino) => mino?.type === "T";
/** T は 3x3 基準なので中心は (x+1, y+1) */
function getCenterOfT(mino) {
    return { cx: (mino?.x ?? 0) + 1, cy: (mino?.y ?? 0) + 1 };
}

/** 角埋まり数と前面2角の埋まり数を計測（盤外は埋まり扱い） */
export function tSpinCornerInfo(mino, fieldBeforeClear) {
    const { cx, cy } = getCenterOfT(mino);
    const H = fieldBeforeClear?.length ?? 20;
    const W = fieldBeforeClear?.[0]?.length ?? 10;

    const corners = [[-1,-1],[1,-1],[-1,1],[1,1]];
    let cornersFilled = 0;
    for (const [dx, dy] of corners) {
        const x = cx + dx, y = cy + dy;
        if (x < 0 || x >= W || y < 0 || y >= H) cornersFilled++;
        else if (fieldBeforeClear[y][x]) cornersFilled++;
    }

    const r = (mino?.r ?? mino?.rotation ?? 0) % 4;
    let fronts;
    if (r === 0) fronts = [[-1,-1],[ 1,-1]];
    else if (r === 1) fronts = [[ 1,-1],[ 1, 1]];
    else if (r === 2) fronts = [[-1, 1],[ 1, 1]];
    else fronts = [[-1,-1],[-1, 1]];

    let frontFilled = 0;
    for (const [dx, dy] of fronts) {
        const x = cx + dx, y = cy + dy;
        if (x < 0 || x >= W || y < 0 || y >= H) frontFilled++;
        else if (fieldBeforeClear[y][x]) frontFilled++;
    }
    return { cornersFilled, frontFilled };
}

/** 厳密T-Spin/Mini判定 */
export function classifyTSpinStrict(mino, fieldBeforeClear, lastSpin, lines) {
    if (!isTPiece(mino) || !lastSpin?.rotated) return "normal";
    const { cornersFilled, frontFilled } = tSpinCornerInfo(mino, fieldBeforeClear);
    if (cornersFilled < 3) return "normal";
    if (lines === 0) return "tspin-mini";
    if (lines === 1) return (frontFilled === 2) ? "tspin" : "tspin-mini";
    return "tspin";
}