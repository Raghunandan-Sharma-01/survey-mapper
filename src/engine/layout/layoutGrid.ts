// layout/layoutGrid.ts
// Snake positions + row heights. assignSlotGrid uses the fixed NODE_H estimate;
// assignRowYMeasured is the height-aware version for the auto-height pass.

import { Slot, groupByLogic } from "./layoutPreparation";
import { NODE_W, NODE_H, COL_GAP, ROW_GAP, COLS, SUB_GAP } from "./layoutConstants";

export function assignSlotGrid(slots: Slot[]): number[] {
  const rowUnits: number[] = [];

  slots.forEach((slot, k) => {
    const row = Math.floor(k / COLS);
    const posInRow = k % COLS;
    const col = row % 2 === 0 ? posInRow : COLS - 1 - posInRow;

    (slot as Slot & { x: number; row: number }).x = col * (NODE_W + COL_GAP);
    (slot as Slot & { row: number }).row = row;

    // band depth = tallest logic column (one column per condition, no wrap)
    const groups = groupByLogic(slot.detours);
    const depth = groups.reduce((m, g) => Math.max(m, g.length), 0);
    rowUnits[row] = Math.max(rowUnits[row] || 0, depth);
  });

  const rowY: number[] = [];
  let currentY = ROW_GAP;
  rowUnits.forEach((units, row) => {
    rowY[row] = currentY;
    currentY += NODE_H + (units > 0 ? 40 + units * (NODE_H + SUB_GAP) : 0) + ROW_GAP;
  });
  return rowY;
}

// Height-aware version: pass measured heights (nodeId -> px) from React Flow.
export function assignRowYMeasured(
  slots: Slot[],
  heights: Record<string, number>
): number[] {
  const h = (id: string) => heights[id] ?? NODE_H;
  const rowSpineH: number[] = [];
  const rowChildH: number[] = [];

  slots.forEach((slot, k) => {
    const row = Math.floor(k / COLS);
    const posInRow = k % COLS;
    const col = row % 2 === 0 ? posInRow : COLS - 1 - posInRow;
    (slot as Slot & { x: number; row: number }).x = col * (NODE_W + COL_GAP);
    (slot as Slot & { row: number }).row = row;

    rowSpineH[row] = Math.max(rowSpineH[row] || 0, h(slot.spine.q.id));

    const groups = groupByLogic(slot.detours);
    const colH = groups.reduce((max, g) => {
      const sum = g.reduce((a, d) => a + h(d.q.id) + SUB_GAP, 0);
      return Math.max(max, sum);
    }, 0);
    rowChildH[row] = Math.max(rowChildH[row] || 0, colH);
  });

  const rowY: number[] = [];
  let y = ROW_GAP;
  rowSpineH.forEach((spineH, row) => {
    rowY[row] = y;
    const band = rowChildH[row] > 0 ? 40 + rowChildH[row] : 0;
    y += spineH + band + ROW_GAP;
  });
  return rowY;
}