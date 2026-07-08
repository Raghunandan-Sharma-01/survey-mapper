import { Node, Edge } from "reactflow";
import { Question, QuestionLogic, SurveyBlock, LogicNode } from "../types/logic";
import { getLayoutedGraph } from "./layout/getLayoutedGraph";

export function buildGraphLevelLayout(
  refinedQuestions: Question[],
  logicMap: Record<string, QuestionLogic>,
  blocks: Record<string, SurveyBlock>,
  readableCondition: (node: LogicNode | null | undefined) => string
): { nodes: Node[]; edges: Edge[] } {
  
  // 1. Generate standard graph using Dagre Auto-Layout
  const { nodes, edges } = getLayoutedGraph(
    refinedQuestions, 
    logicMap, 
    blocks, 
    readableCondition
  );

  return { nodes, edges };
}

// Export utilities
export { calculateAllPaths } from "./pathCalculator";