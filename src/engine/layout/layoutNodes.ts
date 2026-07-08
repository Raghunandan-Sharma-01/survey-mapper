import { Node } from "reactflow";
import { Prepared } from "./layoutPreparation";

export function makeQuestionNode(p: Prepared): Node {
  return {
    id: p.q.id,
    type: "questionNode",
    position: { x: 0, y: 0 },
    data: {
      label: p.q.name,
      fullName: p.q.name,
      type: p.q.type,
      sectionName: p.q.sectionName,
      isInLoop: p.q.isInLoop,
      hasLogic: !!p.showText || !!p.termText,
      logicText: p.showText,
      isBranchingLogic: p.cond,
    },
  };
}

export function makeTerminateNode(ownerId: string, termText: string | null): Node {
  return {
    id: `TERM-${ownerId}`,
    type: "terminateNode",
    position: { x: 0, y: 0 },
    data: { logicText: termText },
  };
}
