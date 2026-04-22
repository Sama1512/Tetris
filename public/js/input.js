// 互換シム: 既存コードが /js/input.js を読む想定でも、実体は /js/core/input.js にある前提。
// 名前付き/デフォルトの両方を面倒見とく。
import * as InputCore from "./core/input.js";
export * from "./core/input.js";
export default InputCore;