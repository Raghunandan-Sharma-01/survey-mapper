import { Node, Edge } from "reactflow";
import { Slot } from "./layoutPreparation";
import { makeQuestionNode } from "./layoutNodes";
import { assignSlotGrid } from "./layoutGrid";
import {
  routeSpineEdges,
  routeDetourNodesAndEdges,
  routeTerminateEdges,
} from "./layoutEdges";

export function layoutAndRoute(slots: Slot[]): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const rowY = assignSlotGrid(slots);

  slots.forEach((slot) => {
    const s = slot as Slot & { x: number; row: number };
    const node = makeQuestionNode(slot.spine);
    node.position = { x: s.x, y: rowY[s.row] };
    nodes.push(node);
  });

  routeSpineEdges(slots, edges);
  routeDetourNodesAndEdges(slots, rowY, nodes, edges);
  routeTerminateEdges(slots, rowY, nodes, edges);

  return { nodes, edges };
}
