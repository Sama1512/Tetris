import { setupControls } from "../core/input.js";
import { drawField, setDrawState } from "../core/draw.js";
import { getNextBag, MINOS } from "../core/mino.js";
import { updateUI } from "../ui/ui.js";
import { requestAIAction } from "./ai_call.js";
import { Field } from "../core/field.js";

export function startAIGame(onStateUpdate) {
  const field = new Field();
  let queue = [...getNextBag()];
  let nextCount = 5;

  function getNextMino() {
    if (queue.length < 7) {
      queue.push(...getNextBag());
    }
    const mino = queue.shift();
    return { ...mino, x: 3, y: 0, rotation: 0, blocks: MINOS[mino.type][0] };
  }

  let current = getNextMino();

  drawField(field.grid, current);
  const state = {
    field: field.grid,
    mino: current,
    queue,
    count: nextCount,
    hold: null,
  };
  setDrawState(state);
  if (typeof onStateUpdate === "function") {
    onStateUpdate(state);  // 初期状態を通知
  }

  async function step() {
    const aiMove = await requestAIAction({ field: field.grid, current });

    current.x = aiMove.x;
    current.y = aiMove.y;
    current.rotation = aiMove.rotation;
    current.blocks = MINOS[current.type][current.rotation];

    field.place(current);
    field.clearLines();

    current = getNextMino();
    drawField(field.grid, current);

    const newState = {
      field: field.grid,
      mino: current,
      queue,
      count: nextCount,
      hold: null,
    };
    setDrawState(newState);
    if (typeof onStateUpdate === "function") {
      onStateUpdate(newState);
    }

    updateUI({});
    setTimeout(step, 500);
  }

  setupControls();
  step();
}