import { SpineNode } from "./SpineNode";
import { BranchNode, LoopNode } from "./BranchBlock";
import { BusAnchor } from "./BusAnchor";
import { SectionHeader } from "./SectionHeader";

/** Stable node-type map for ReactFlow. */
export const nodeTypes = {
  spineNode: SpineNode,
  branchNode: BranchNode,
  loopNode: LoopNode,
  busAnchor: BusAnchor,
  sectionHeader: SectionHeader,
};

export { SpineNode, BranchNode, LoopNode, BusAnchor, SectionHeader };
