// 厳密T-Spin/Mini 判定ロジック
import { isTPiece, getCenterOfT } from "./mino.js";

/** 角埋まり数と前面2角の埋まり数を計測（盤外は埋まり扱い） */
export function tSpinCornerInfo(mino, fieldBeforeClear) {
    const { cx, cy } = getCenterOfT(mino);
    const corners = [[-1,-1],[1,-1],[-1,1],[1,1]]; // TL,TR,BL,BR
    let cornersFilled = 0;
    for (const [dx, dy] of corners) {
        const x = cx + dx, y = cy + dy;
        if (y < 0 || y >= fieldBeforeClear.length || x < 0 || x >= fieldBeforeClear[0].length) cornersFilled++;
        else if (fieldBeforeClear[y][x]) cornersFilled++;
    }

    // 向き別の「前面2角」
    const r = (mino.r ?? 0) % 4;
    let fronts;
    if (r === 0) fronts = [[-1,-1],[ 1,-1]];     // up
    else if (r === 1) fronts = [[ 1,-1],[ 1, 1]]; // right
    else if (r === 2) fronts = [[-1, 1],[ 1, 1]]; // down
    else fronts = [[-1,-1],[-1, 1]];              // left
    let frontFilled = 0;
    for (const [dx, dy] of fronts) {
        const x = cx + dx, y = cy + dy;
        if (y < 0 || y >= fieldBeforeClear.length || x < 0 || x >= fieldBeforeClear[0].length) frontFilled++;
        else if (fieldBeforeClear[y][x]) frontFilled++;
    }
    return { cornersFilled, frontFilled };
}

/** 厳密T-Spin/Mini判定 */
export function classifyTSpinStrict(mino, fieldBeforeClear, lastSpin, lines) {
    if (!isTPiece(mino) || !lastSpin?.rotated) return "normal";
    const { cornersFilled, frontFilled } = tSpinCornerInfo(mino, fieldBeforeClear);
    const isSpin = cornersFilled >= 3;
    if (!isSpin) return "normal";
    if (lines === 0) return "tspin-mini";
    if (lines === 1) return (frontFilled === 2) ? "tspin" : "tspin-mini";
    return "tspin";
}