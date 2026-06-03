import { Node, Edge } from "reactflow";
import {
  Question,
  QuestionLogic,
  SurveyBlock,
  LogicNode,
} from "../types/logic";
import { extractAllParentIds } from "./dependencyAnalyzer";

interface LayoutConfig {
  maxNodesPerLevel: number;
  horizontalSpacing: number;
  verticalBranchSpacing: number;
  verticalRowSpacing: number;
}

/**
 * Calculates node positions and generates connecting edges based on layout rules
 */
export function calculatePositionsAndBaseEdges(
  refinedQuestions: Question[],
  branchChildrenMap: Record<string, string[]>,
  branchChildSet: Set<string>,
  config: LayoutConfig
) {
  const calculatedPositions: Record<string, { x: number; y: number }> = {};
  const generatedEdges: Edge[] = [];

  let currentHorizontalIndex = 0;
  let currentVerticalPixel = 0;
  let snakeDirection = 1;

  let previousTrunkNodeId: string | null = null;
  let previousTrunkPosition: { x: number; y: number } | null = null;
  let previousConvergingLeaves: string[] = [];

  const getEdgeHandles = (
    fromPosition: { x: number; y: number },
    toPosition: { x: number; y: number }
  ) => {
    if (toPosition.y > fromPosition.y)
      return { sourceHandle: "bottom-s", targetHandle: "top-t" };
    if (toPosition.x > fromPosition.x)
      return { sourceHandle: "right-s", targetHandle: "left-t" };
    return { sourceHandle: "left-s", targetHandle: "right-t" };
  };

  refinedQuestions.forEach((currentQuestion) => {
    const questionId = currentQuestion.id.toString();

    if (branchChildSet.has(questionId)) return;

    const currentPosition = {
      x: currentHorizontalIndex * config.horizontalSpacing,
      y: currentVerticalPixel,
    };
    calculatedPositions[questionId] = currentPosition;

    // Connect previous leaves back to this new trunk node
    if (previousConvergingLeaves.length > 0) {
      previousConvergingLeaves.forEach((leafId) => {
        generatedEdges.push({
          id: `seq-${leafId}-${questionId}`,
          source: leafId,
          target: questionId,
          sourceHandle: "bottom-s",
          targetHandle: "top-t",
          type: "step",
          style: { stroke: "#9ca3af", strokeWidth: 2 },
        });
      });
    } else if (previousTrunkNodeId && previousTrunkPosition) {
      const handles = getEdgeHandles(previousTrunkPosition, currentPosition);
      generatedEdges.push({
        id: `seq-${previousTrunkNodeId}-${questionId}`,
        source: previousTrunkNodeId,
        target: questionId,
        sourceHandle: handles.sourceHandle,
        targetHandle: handles.targetHandle,
        type: "smoothstep",
        style: { stroke: "#9ca3af", strokeWidth: 2 },
      });
    }

    const childBranches = branchChildrenMap[questionId] || [];

    if (childBranches.length > 0) {
      let maximumClusterVerticalPixel = currentVerticalPixel;
      let currentClusterLeaves: string[] = [];

      function placeBranchesRecursively(
        parentId: string,
        parentPosition: { x: number; y: number }
      ) {
        const nestedChildren = branchChildrenMap[parentId] || [];

        if (nestedChildren.length === 0) {
          currentClusterLeaves.push(parentId);
          maximumClusterVerticalPixel = Math.max(
            maximumClusterVerticalPixel,
            parentPosition.y
          );
          return;
        }

        const branchVerticalPixel =
          parentPosition.y + config.verticalBranchSpacing;
        const totalBranchWidth =
          (nestedChildren.length - 1) * config.horizontalSpacing;
        const startHorizontalPixel = Math.max(
          0,
          parentPosition.x - totalBranchWidth / 2
        );

        nestedChildren.forEach((childId, index) => {
          const childPosition = {
            x: startHorizontalPixel + index * config.horizontalSpacing,
            y: branchVerticalPixel,
          };
          calculatedPositions[childId] = childPosition;

          generatedEdges.push({
            id: `branch-${parentId}-${childId}`,
            source: parentId,
            target: childId,
            sourceHandle: "bottom-s",
            targetHandle: "top-t",
            type: "smoothstep",
            animated: true,
            style: { stroke: "#3b82f6", strokeWidth: 2 },
          });

          placeBranchesRecursively(childId, childPosition);
        });
      }

      const topLevelBranchVerticalPixel =
        currentVerticalPixel + config.verticalBranchSpacing;
      const topLevelTotalWidth =
        (childBranches.length - 1) * config.horizontalSpacing;
      const topLevelStartHorizontalPixel = Math.max(
        0,
        currentPosition.x - topLevelTotalWidth / 2
      );

      childBranches.forEach((branchId, index) => {
        const branchPosition = {
          x: topLevelStartHorizontalPixel + index * config.horizontalSpacing,
          y: topLevelBranchVerticalPixel,
        };
        calculatedPositions[branchId] = branchPosition;

        generatedEdges.push({
          id: `branch-${questionId}-${branchId}`,
          source: questionId,
          target: branchId,
          sourceHandle: "bottom-s",
          targetHandle: "top-t",
          type: "smoothstep",
          animated: true,
          style: { stroke: "#3b82f6", strokeWidth: 2 },
        });

        placeBranchesRecursively(branchId, branchPosition);
      });

      currentVerticalPixel =
        maximumClusterVerticalPixel + config.verticalRowSpacing;
      currentHorizontalIndex = 0;
      snakeDirection = 1;

      previousConvergingLeaves = currentClusterLeaves;
      previousTrunkNodeId = questionId;
      previousTrunkPosition = currentPosition;
    } else {
      if (snakeDirection === 1) {
        if (currentHorizontalIndex >= config.maxNodesPerLevel - 1) {
          currentVerticalPixel += config.verticalRowSpacing;
          snakeDirection = -1;
        } else {
          currentHorizontalIndex++;
        }
      } else {
        if (currentHorizontalIndex <= 0) {
          currentVerticalPixel += config.verticalRowSpacing;
          snakeDirection = 1;
        } else {
          currentHorizontalIndex--;
        }
      }

      previousConvergingLeaves = [];
      previousTrunkNodeId = questionId;
      previousTrunkPosition = currentPosition;
    }
  });

  return { calculatedPositions, generatedEdges };
}

/**
 * Creates ReactFlow nodes with termination points and edges
 */
export function createReactFlowNodesAndTerminations(
  refinedQuestions: Question[],
  calculatedPositions: Record<string, { x: number; y: number }>,
  logicMap: Record<string, QuestionLogic>,
  blocks: Record<string, SurveyBlock>,
  readableCondition: (node: LogicNode | null | undefined) => string
) {
  const reactFlowNodes: Node[] = [];
  const terminationEdges: Edge[] = [];

  refinedQuestions.forEach((question) => {
    const questionId = question.id.toString();
    const position = calculatedPositions[questionId];
    if (!position) return;

    const logic = logicMap[questionId];
    const isQuestionInLoop = question.parentBlocks.some(
      (blockId) => blocks[blockId]?.type === "Loop"
    );

    reactFlowNodes.push({
      id: questionId,
      type: "questionNode",
      position: position,
      data: {
        label: question.name,
        fullName: question.fullName,
        type: question.type,
        sectionName: question.sectionName,
        hasLogic: !!logic?.show,
        logicText: logic?.show ? readableCondition(logic.show) : undefined,
        isInLoop: isQuestionInLoop,
      },
      className: isQuestionInLoop
        ? "border-2 border-dashed border-orange-500 bg-orange-50"
        : "",
    });

    if (logic?.terminate) {
      const terminationId = `TERM-${questionId}`;
      reactFlowNodes.push({
        id: terminationId,
        type: "output",
        position: { x: position.x + 200, y: position.y + 90 },
        data: { label: "🛑 TERMINATE" },
        className:
          "bg-red-50 border border-red-500 text-red-700 text-xs w-[110px] text-center rounded z-10",
      });

      terminationEdges.push({
        id: `e-term-${questionId}`,
        source: questionId,
        target: terminationId,
        sourceHandle: "right-s",
        targetHandle: "top-t",
        type: "step",
        style: { stroke: "#ef4444", strokeWidth: 2, strokeDasharray: "4 4" },
      });
    }
  });

  return { mappedNodes: reactFlowNodes, terminationEdges };
}

/**
 * Creates special edges for long-distance dependencies and loops
 */
export function createSpecialEdges(
  longDistanceDependencies: { source: string; target: string }[],
  blocks: Record<string, SurveyBlock>
) {
  const specialEdges: Edge[] = [];

  longDistanceDependencies.forEach((dependency) => {
    specialEdges.push({
      id: `ld-logic-${dependency.source}-${dependency.target}`,
      source: dependency.source,
      target: dependency.target,
      sourceHandle: "bottom-s",
      targetHandle: "top-t",
      type: "smoothstep",
      animated: true,
      style: {
        stroke: "#3b82f6",
        strokeWidth: 2,
        strokeDasharray: "5 5",
        opacity: 0.6,
      },
    });
  });

  const loopBlocksArray = Object.values(blocks).filter(
    (block) => block.type === "Loop"
  );

  loopBlocksArray.forEach((loop) => {
    if (!loop.firstQuestionId || !loop.lastQuestionId) return;

    specialEdges.push({
      id: `loop-${loop.id}`,
      source: loop.lastQuestionId,
      target: loop.firstQuestionId,
      type: "step",
      animated: true,
      style: { stroke: "#f97316", strokeWidth: 3, strokeDasharray: "5 5" },
      sourceHandle: "top-s",
      targetHandle: "top-t",
    });
  });

  return specialEdges;
}