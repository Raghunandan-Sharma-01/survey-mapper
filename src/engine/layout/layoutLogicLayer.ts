// layout/layoutLogicLayer.ts
// Dotted "gated-by distant question" edges. triggerIds are precomputed in
// prepare(); this only draws them. Call after layout so positions exist.

import { Edge } from "reactflow";
import { Slot, Prepared } from "./layoutPreparation";
import { LOGIC_COLOR } from "./layoutConstants";

function addLogicEdge(edges: Edge[], source: string, target: string, sh: string, th: string) {
  edges.push({
    id: `lg-${source}-${target}`,
    source,
    target,
    sourceHandle: sh,
    targetHandle: th,
    type: "smoothstep",
    animated: false,
    hidden: true,                 // hover-only: shown when a connected node is selected/hovered
    data: { kind: "logic" },
    style: { stroke: LOGIC_COLOR, strokeWidth: 1.5, strokeDasharray: "2 6" },
  });
}

export function routeLogicEdges(
  slots: Slot[],
  nodes: any[],
  edges: Edge[],
  skipImmediateParent = true
) {
  const byId = new Map<string, any>();
  nodes.forEach((n) => byId.set(n.id, n));

  slots.forEach((slot) => {
    slot.detours.forEach((d: Prepared) => {
      const detourNode = byId.get(d.q.id);
      if (!detourNode) return;

      (d.triggerIds ?? []).forEach((tid) => {
        if (tid === d.q.id) return;
        if (skipImmediateParent && tid === slot.spine.q.id) return;
        const trigNode = byId.get(tid);
        if (!trigNode) return;

        const trigLeft = trigNode.position.x <= detourNode.position.x;
        addLogicEdge(edges, tid, d.q.id, trigLeft ? "right-s" : "left-s", trigLeft ? "left-t" : "right-t");
      });
    });
  });
}