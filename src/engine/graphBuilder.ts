/**
 * Main graph builder that orchestrates layout calculation from split modules
 * Imports path calculation, dependency analysis, and layout calculation engines
 */

import { Node, Edge } from "reactflow";
import {
  Question,
  QuestionLogic,
  SurveyBlock,
  LogicNode,
} from "../types/logic";
import { calculateAllPaths } from "./pathCalculator";
import { analyzeDependencies } from "./dependencyAnalyzer";
import {
  calculatePositionsAndBaseEdges,
  createReactFlowNodesAndTerminations,
  createSpecialEdges,
} from "./layoutCalculator";

/**
 * Main entry point for building the graph layout
 * Orchestrates all sub-engines to calculate positions, nodes, and edges
 */
export function buildGraphLevelLayout(
  refinedQuestions: Question[],
  logicMap: Record<string, QuestionLogic>,
  blocks: Record<string, SurveyBlock>,
  readableCondition: (node: LogicNode | null | undefined) => string,
  maxNodesPerLevel = 5,
  horizontalSpacing = 320,
  verticalBranchSpacing = 220,
  verticalRowSpacing = 120,
): { nodes: Node[]; edges: Edge[] } {
  // Step 1: Analyze dependencies to identify branches and long-distance links
  const { branchChildrenMap, branchChildSet, longDistanceDependencies } =
    analyzeDependencies(refinedQuestions, logicMap);

  // Step 2: Calculate positions and generate base edges
  const { calculatedPositions, generatedEdges } = calculatePositionsAndBaseEdges(
    refinedQuestions,
    branchChildrenMap,
    branchChildSet,
    {
      maxNodesPerLevel,
      horizontalSpacing,
      verticalBranchSpacing,
      verticalRowSpacing,
    },
  );

  // Step 3: Create ReactFlow nodes and termination edges
  const { mappedNodes, terminationEdges } = createReactFlowNodesAndTerminations(
    refinedQuestions,
    calculatedPositions,
    logicMap,
    blocks,
    readableCondition,
  );

  // Step 4: Create special edges for long-distance dependencies and loops
  const specialEdges = createSpecialEdges(longDistanceDependencies, blocks);

  return {
    nodes: mappedNodes,
    edges: [...generatedEdges, ...terminationEdges, ...specialEdges],
  };
}

// Export utility functions for external use
export { calculateAllPaths } from "./pathCalculator";
export { analyzeDependencies, extractAllParentIds } from "./dependencyAnalyzer";