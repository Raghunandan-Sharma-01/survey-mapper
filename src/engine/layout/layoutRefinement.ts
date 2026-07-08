import { Edge } from "reactflow";
import { Slot } from "./layoutPreparation";
import { groupByLogic } from "./layoutChildGroups";
import { NODE_W, NODE_H, SUB_GAP, SEQ_COLOR, BRANCH_COLOR } from "./layoutConstants";
import { addEdgeExact } from "./layoutEdges";

const wpId = (slotSpineId: string) => `wp-${slotSpineId}`;

// routeSpineEdges: when the previous slot branches, the away edge runs
// prev.spine -> waypoint (so the waypoint -> next segment is shared with the
// children's return). Otherwise unchanged.
export function routeSpineEdges(slots: Slot[], edges: Edge[]) {
  for (let i = 1; i < slots.length; i++) {
    const prev = slots[i - 1] as Slot & { row: number };
    const curr = slots[i] as Slot & { row: number };
    const sameRow = prev.row === curr.row;

    const srcHandle = sameRow ? (prev.row % 2 === 0 ? "right-s" : "left-s") : "bottom-s";
    const tgtHandle = sameRow ? (prev.row % 2 === 0 ? "left-t" : "right-t") : "top-t";

    if (prev.detours.length > 0) {
      // away edge stops at the waypoint; waypoint -> curr is drawn in the
      // detour pass and carries both the spine flow and the children return.
      addEdgeExact(edges, prev.spine.q.id, wpId(prev.spine.q.id), srcHandle, "top-t", SEQ_COLOR);
    } else {
      addEdgeExact(edges, prev.spine.q.id, curr.spine.q.id, srcHandle, tgtHandle, SEQ_COLOR);
    }
  }
}

// In routeDetourNodesAndEdges, REPLACE the per-column "tail -> next.spine" block
// with a single waypoint that merges everything:
export function mergeChildrenIntoAwayEdge(
  slot: Slot,
  next: Slot | undefined,
  groups: ReturnType<typeof groupByLogic>,
  s: Slot & { x: number; row: number },
  baseY: number,
  tallestCol: number,
  nodes: any[],
  edges: Edge[]
) {
  if (!next) return;

  const wp = wpId(slot.spine.q.id);
  const childBottom = baseY + tallestCol * (NODE_H + SUB_GAP);

  // Waypoint sits just below the child band, aligned under the parent's exit.
  nodes.push({
    id: wp,
    type: "merge",
    draggable: false,
    selectable: false,
    position: { x: s.x + NODE_W / 2, y: childBottom + 16 },
    data: {},
    style: { width: 1, height: 1, opacity: 0 },
  });

  // Every column tail folds into the waypoint...
  groups.forEach((g) => {
    const tail = g[g.length - 1];
    addEdgeExact(edges, tail.q.id, wp, "bottom-s", "top-t", BRANCH_COLOR);
  });

  addEdgeExact(edges, wp, (next as Slot).spine.q.id, "bottom-s", "top-t", SEQ_COLOR);
}

export function assignRowYMeasured(
  slots: Slot[],
  heights: Record<string, number>,
  COLS: number,
  COL_GAP: number,
  ROW_GAP: number
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

    // tallest child COLUMN = greatest summed height among logic groups
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
