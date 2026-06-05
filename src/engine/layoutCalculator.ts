import { Node, Edge } from "reactflow";
import dagre from "dagre";
import { Question, QuestionLogic, SurveyBlock, LogicNode } from "../types/logic";

const NODE_WIDTH = 250;
const NODE_HEIGHT = 120;

export function extractAllParentIds(
  node: LogicNode | null | undefined,
  ids = new Set<string>()
): string[] {
  if (!node) return [];
  if (node.type === "leaf" && node.questionId) {
    ids.add(node.questionId.toString());
  } else if (node.type === "branch" && node.children) {
    node.children.forEach((child) => extractAllParentIds(child, ids));
  }
  return Array.from(ids);
}

export function getLayoutedGraph(
  refinedQuestions: Question[],
  logicMap: Record<string, QuestionLogic>,
  blocks: Record<string, SurveyBlock>,
  readableCondition: (node: LogicNode | null | undefined) => string
): { nodes: Node[]; edges: Edge[] } {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  dagreGraph.setGraph({ 
    rankdir: 'LR', 
    ranksep: 100,  
    nodesep: 60,   
  });

  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const safeBlocks = blocks || {};

  // Strip out empty structural markers so they don't break the layout
  const validQuestions = refinedQuestions.filter(q => !/loop\s*start|loop\s*end/i.test(q.name));

  // --- PASS 1: GENERATE NODES ---
  validQuestions.forEach((question) => {
    const questionId = question.id.toString();
    const logic = logicMap[questionId];
    
    const rawShowText = (logic as any)?.rawShowText || (typeof logic?.show === 'string' ? logic.show : null);
    const finalLogicText = logic?.show && typeof logic.show !== 'string' 
      ? readableCondition(logic.show) 
      : rawShowText;

    const rawTermText = (logic as any)?.rawTerminateText || (typeof logic?.terminate === 'string' ? logic.terminate : null);

    nodes.push({
      id: questionId,
      type: "questionNode",
      position: { x: 0, y: 0 },
      data: {
        label: question.name,
        fullName: question.name, // Keep node text short and readable
        type: question.type,
        sectionName: question.sectionName,
        hasLogic: !!logic?.show || !!logic?.terminate || !!finalLogicText,
        logicText: finalLogicText,
        isInLoop: question.parentBlocks.some(bId => safeBlocks[bId]?.type === "Loop"),
      },
      className: question.parentBlocks.some(bId => safeBlocks[bId]?.type === "Loop")
        ? "border-2 border-dashed border-orange-500 bg-orange-50"
        : "",
    });

    // Generate Terminate Nodes (Hidden from Dagre, pinned later)
    if (logic?.terminate || rawTermText) {
      nodes.push({
        id: `TERM-${questionId}`,
        type: "output",
        position: { x: 0, y: 0 },
        data: { 
          label: "🛑 TERMINATE",
          logicText: rawTermText 
        },
        className: "bg-red-50 border border-red-500 text-red-700 text-xs w-[250px] text-left rounded shadow-sm z-10 p-2",
      });

      edges.push({
        id: `e-term-${questionId}`,
        source: questionId,
        target: `TERM-${questionId}`,
        sourceHandle: "bottom-s", 
        targetHandle: "top-t",
        type: "smoothstep",
        style: { stroke: "#ef4444", strokeWidth: 2, strokeDasharray: "4 4" },
      });
    }
  });

  // --- PASS 2: THE "FLOATING TAILS" GROUPING ALGORITHM ---
  let lastUnconditionalId: string | null = null;
  
  // Maps the logic text to the ID of the last node in that specific logic sequence
  const floatingTails = new Map<string, string>(); 

  validQuestions.forEach((question) => {
    const qId = question.id.toString();
    const node = nodes.find(n => n.id === qId);
    if (!node) return;

    const logicTxt = node.data.logicText;

    if (!logicTxt) {
      // 1. UNCONDITIONAL NODE (Main Spine)
      // Merge ALL active branches back into this node
      if (floatingTails.size > 0) {
        floatingTails.forEach((tailId) => {
          edges.push({
            id: `merge-${tailId}-${qId}`,
            source: tailId,
            target: qId,
            sourceHandle: "right-s",
            targetHandle: "left-t",
            type: "smoothstep",
            style: { stroke: "#9ca3af", strokeWidth: 2 },
          });
        });
        floatingTails.clear(); // Reset active branches
      } else if (lastUnconditionalId) {
        // If there were no branches, just continue the main spine
        edges.push({
          id: `seq-${lastUnconditionalId}-${qId}`,
          source: lastUnconditionalId,
          target: qId,
          sourceHandle: "right-s",
          targetHandle: "left-t",
          type: "smoothstep",
          style: { stroke: "#9ca3af", strokeWidth: 2 },
        });
      }
      lastUnconditionalId = qId;
      
    } else {
      // 2. CONDITIONAL NODE (Branches)
      if (floatingTails.has(logicTxt)) {
        // This node shares logic with the previous node! Connect them sequentially in a block.
        const tailId = floatingTails.get(logicTxt)!;
        edges.push({
          id: `seq-${tailId}-${qId}`,
          source: tailId,
          target: qId,
          sourceHandle: "right-s",
          targetHandle: "left-t",
          type: "smoothstep",
          style: { stroke: "#9ca3af", strokeWidth: 2 },
        });
        floatingTails.set(logicTxt, qId); // Update the tail of this logic block
      } else {
        // This is the START of a brand new branch! Connect from its parent.
        const logicNodeAST = logicMap[qId]?.show;
        const dependencies = extractAllParentIds(logicNodeAST);

        if (dependencies.length > 0) {
          dependencies.forEach(parentId => {
            edges.push({
              id: `dep-${parentId}-${qId}`,
              source: parentId,
              target: qId,
              sourceHandle: "right-s", 
              targetHandle: "left-t",
              type: "smoothstep",
              animated: true,
              style: { stroke: "#3b82f6", strokeWidth: 2 },
            });
          });
        } else if (lastUnconditionalId) {
          edges.push({
            id: `fallback-${lastUnconditionalId}-${qId}`,
            source: lastUnconditionalId,
            target: qId,
            sourceHandle: "right-s",
            targetHandle: "left-t",
            type: "smoothstep",
            animated: true,
            style: { stroke: "#3b82f6", strokeWidth: 2, strokeDasharray: "5 5" },
          });
        }
        floatingTails.set(logicTxt, qId); // Register new branch tail
      }
    }
  });

  // --- PASS 3: DRAW LOOP EDGES ---
  const loopBlocks = Object.values(safeBlocks).filter(b => b.type === "Loop");
  loopBlocks.forEach((loop) => {
    // Check if the loop bounds still exist in our validQuestions array
    if (loop.firstQuestionId && loop.lastQuestionId && 
        validQuestions.find(q => q.id.toString() === loop.firstQuestionId) &&
        validQuestions.find(q => q.id.toString() === loop.lastQuestionId)) {
      edges.push({
        id: `loop-edge-${loop.id}`,
        source: loop.lastQuestionId,
        target: loop.firstQuestionId,
        sourceHandle: "top-s", 
        targetHandle: "top-t", // Connect Top-to-Top so it arcs backward cleanly
        type: "step",
        animated: true,
        style: { stroke: "#f97316", strokeWidth: 3, strokeDasharray: "6 6" },
        label: "↻ Loop Iteration",
        labelStyle: { fill: "#f97316", fontWeight: 700, fontSize: 10 },
        labelBgPadding: [4, 4],
        labelBgBorderRadius: 4,
      });
    }
  });

  // --- PASS 4: APPLY DAGRE MAGIC ---
  nodes.forEach((node) => {
    if (!node.id.startsWith("TERM-")) {
      dagreGraph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
    }
  });

  edges.forEach((edge) => {
    if (dagreGraph.hasNode(edge.source) && dagreGraph.hasNode(edge.target)) {
      dagreGraph.setEdge(edge.source, edge.target);
    }
  });

  dagre.layout(dagreGraph);

  // --- PASS 5: ALIGN NODES & TUCK TERMINATES ---
  const layoutedNodes = nodes.map((node) => {
    if (node.id.startsWith("TERM-")) {
      const parentId = node.id.replace("TERM-", "");
      const parentPos = dagreGraph.node(parentId);
      if (parentPos) {
        return {
          ...node,
          position: {
            x: parentPos.x - NODE_WIDTH / 2, // Align perfectly with the left edge of parent
            y: (parentPos.y - NODE_HEIGHT / 2) + NODE_HEIGHT + 15, // Tuck exactly 15px underneath
          },
        };
      }
    }

    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - NODE_WIDTH / 2,
        y: nodeWithPosition.y - NODE_HEIGHT / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}