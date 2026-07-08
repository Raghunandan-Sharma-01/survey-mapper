// layout/layoutEdges.ts
// Edge builders + node placement for spine, detour children, terminates.

import { Edge } from "reactflow";
import { Slot, groupByLogic } from "./layoutPreparation";
import { makeQuestionNode, makeTerminateNode } from "./layoutNodes";
import {
  NODE_W, NODE_H, COL_GAP, SUB_GAP, MIN_CHILD_W,
  SEQ_COLOR, BRANCH_COLOR, TERM_COLOR,
} from "./layoutConstants";

const wpId = (spineId: string) => `wp-${spineId}`;

export function addEdgeExact(
  edges: Edge[],
  source: string,
  target: string,
  sourceHandle: string,
  targetHandle: string,
  color: string,
  dashed = false,
  animated = false
) {
  edges.push({
    id: `e-${source}-${target}`,
    source,
    target,
    sourceHandle,
    targetHandle,
    type: "smoothstep",
    animated,
    style: { stroke: color, strokeWidth: 2, ...(dashed ? { strokeDasharray: "4 4" } : {}) },
  });
}

// Spine flow: ALWAYS a direct spine -> next-spine edge, so the snake stays
// visibly connected. Children rejoin separately (see routeDetourNodesAndEdges).
export function routeSpineEdges(slots: Slot[], edges: Edge[]) {
  for (let i = 1; i < slots.length; i++) {
    const prev = slots[i - 1] as Slot & { row: number };
    const curr = slots[i] as Slot & { row: number };
    const sameRow = prev.row === curr.row;
    const srcHandle = sameRow ? (prev.row % 2 === 0 ? "right-s" : "left-s") : "bottom-s";
    const tgtHandle = sameRow ? (prev.row % 2 === 0 ? "left-t" : "right-t") : "top-t";
    addEdgeExact(edges, prev.spine.q.id, curr.spine.q.id, srcHandle, tgtHandle, SEQ_COLOR);
  }
}

// Children grouped by logic into columns (same-logic stacks, distinct-logic
// sit side by side), shrunk to fit, all tails merged into one waypoint that
// folds into the away edge.
export function routeDetourNodesAndEdges(
  slots: Slot[],
  rowY: number[],
  nodes: any[],
  edges: Edge[]
) {
  slots.forEach((slot, k) => {
    const s = slot as Slot & { x: number; row: number };
    const next = slots[k + 1];
    if (slot.detours.length === 0) return;

    // one column per logic condition (same-logic children stack in one line)
    const cols = groupByLogic(slot.detours);
    const nCols = cols.length;

    const maxCellW = NODE_W + COL_GAP - 40;
    let childW = Math.min(NODE_W, (maxCellW - (nCols - 1) * SUB_GAP) / nCols);
    childW = Math.max(childW, MIN_CHILD_W);

    const rowW = nCols * childW + (nCols - 1) * SUB_GAP;
    const startX = s.x + (NODE_W - rowW) / 2;
    const baseY = rowY[s.row] + NODE_H + 40;
    let tallest = 0;
    const tailIds: string[] = [];

    cols.forEach((col, ci) => {
      const colX = startX + ci * (childW + SUB_GAP);
      let prevId = slot.spine.q.id;
      tallest = Math.max(tallest, col.length);

      col.forEach((d, ri) => {
        const node = makeQuestionNode(d);
        node.position = { x: colX, y: baseY + ri * (NODE_H + SUB_GAP) };
        node.style = { ...(node.style || {}), width: childW }; // shrink-to-fit
        nodes.push(node);

        addEdgeExact(edges, prevId, d.q.id, "bottom-s", "top-t", BRANCH_COLOR, false, ri === 0);
        prevId = d.q.id; // child terminates live in the left rail
      });
      tailIds.push(prevId); // bottom of this column
    });

    // ONE merged return: every column tail -> hidden waypoint -> next spine.
    // The spine stays direct (routeSpineEdges), so only the returns merge here.
    if (next) {
      const wp = wpId(slot.spine.q.id);
      nodes.push({
        id: wp,
        type: "merge", // register `merge: () => null` in nodeTypes
        draggable: false,
        selectable: false,
        position: { x: s.x + NODE_W / 2, y: baseY + tallest * (NODE_H + SUB_GAP) + 16 },
        data: {},
        style: { width: 1, height: 1, opacity: 0 },
      });
      tailIds.forEach((tid) => addEdgeExact(edges, tid, wp, "bottom-s", "top-t", BRANCH_COLOR));
      addEdgeExact(edges, wp, next.spine.q.id, "bottom-s", "top-t", BRANCH_COLOR);
    }
  });
}

// All terminates (spine + child) collected into an ordered left rail. Each box
// is width-capped and internally scrollable, so a huge terminate can't push the
// others. Edges are red and hover-dimmed (data.kind = "terminate").
const RAIL_W = 160;
const RAIL_GAP = 90;      // gap between rail and the snake's left edge (x = 0)
const RAIL_SLOT_H = 150;  // vertical pitch per rail box (measured pass refines this)

export function routeTerminateEdges(slots: Slot[], rowY: number[], nodes: any[], edges: Edge[]) {
  // question order: for each slot, spine first, then its detours
  const withTerm: { id: string; text: string }[] = [];
  slots.forEach((slot) => {
    if (slot.spine.termText) withTerm.push({ id: slot.spine.q.id, text: slot.spine.termText });
    slot.detours.forEach((d) => {
      if (d.termText) withTerm.push({ id: d.q.id, text: d.termText });
    });
  });

  const railX = -(RAIL_W + RAIL_GAP); // left of the snake; needs translateExtent to include it
  const top = rowY[0] ?? 0;

  withTerm.forEach((t, i) => {
    const term = makeTerminateNode(t.id, t.text);
    term.position = { x: railX, y: top + i * RAIL_SLOT_H };
    term.style = { ...(term.style || {}), width: RAIL_W }; // width-capped; grows tall, no scrollbar
    nodes.push(term);

    edges.push({
      id: `term-${t.id}`,
      source: term.id,
      target: t.id,
      sourceHandle: "right-s",
      targetHandle: "top-t",
      type: "smoothstep",
      data: { kind: "terminate" },
      style: { stroke: TERM_COLOR, strokeWidth: 2, opacity: 0.45 }, // hover-dimmed
    });
  });
}