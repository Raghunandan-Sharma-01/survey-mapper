// layout/getLayoutedGraph.ts  (entry point your React component calls)

import { Node, Edge } from "reactflow";
import { Question, QuestionLogic, SurveyBlock, LogicNode } from "../../types/logic";
import { buildBoundingBoxes } from "./layoutBoundingBoxes";
import { layoutAndRoute } from "./layoutRouter";
import { prepare, groupSlots } from "./layoutPreparation";
import { routeLogicEdges } from "./layoutLogicLayer";

export function getLayoutedGraph(
  refinedQuestions: Question[],
  logicMap: Record<string, QuestionLogic>,
  blocks: Record<string, SurveyBlock>,
  readableCondition: (node: LogicNode | null | undefined) => string
): { nodes: Node[]; edges: Edge[] } {
  const validQuestions = refinedQuestions.filter(
    (q) =>
      q.type !== "Structural Marker" &&
      !(q.name || "").toLowerCase().includes("[hidden]")
  );

  // 4th arg: full effective logic needs the question set for inherited gating.
  const prepared = validQuestions.map((q) =>
    prepare(q, logicMap, readableCondition, refinedQuestions)
  );
  const slots = groupSlots(prepared);

  const { nodes: layoutedNodes, edges } = layoutAndRoute(slots);

  // Always-visible (hover-dim in UI) dotted gating layer; needs positions.
  routeLogicEdges(slots, layoutedNodes, edges);

  const boundingBoxes = buildBoundingBoxes(layoutedNodes, validQuestions, blocks);
  return { nodes: [...boundingBoxes, ...layoutedNodes], edges };
}