import { Node, Edge } from "reactflow";
import dagre from "dagre";
import { Question, QuestionLogic, SurveyBlock, LogicNode } from "../types/logic";

const NODE_WIDTH = 250;
const NODE_HEIGHT = 120;

// ==========================================
// 1. UTILITIES (The Upgraded Parent Extractor)
// ==========================================

export function extractClosestParentId(
  logicNode: LogicNode | null | undefined,
  rawLogicText: string | null | undefined,
  validQuestionIds: string[],
  currentIndex: number
): string | null {
  const rawIds = new Set<string>();

  // 1. Try AST extraction first
  function traverse(n: LogicNode) {
    if (n.type === "leaf" && n.questionId) {
      rawIds.add(n.questionId.toString());
    } else if (n.type === "branch" && n.children) {
      n.children.forEach(traverse);
    }
  }
  if (logicNode) traverse(logicNode);

  // 2. The Regex Safety Net: Scan raw text for known Question IDs
  if (rawLogicText) {
    validQuestionIds.forEach(id => {
      // Escape the ID safely and look for it as a whole word
      const escapedId = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedId}\\b`, 'i');
      if (regex.test(rawLogicText)) {
        rawIds.add(id);
      }
    });
  }

  if (rawIds.size === 0) return null;

  // 3. Find the LATEST valid parent (chronologically closest to the current node)
  let closestIdx = -1;
  let closestId: string | null = null;

  rawIds.forEach(id => {
    const idx = validQuestionIds.indexOf(id);
    // Ensure the parent actually occurs BEFORE the current question in the survey
    if (idx > closestIdx && idx < currentIndex) {
      closestIdx = idx;
      closestId = id;
    }
  });

  return closestId;
}

function isNodeBranching(logicText: string | null): boolean {
  if (!logicText) return false;
  const lowerText = logicText.toLowerCase();
  const isUnconditional = lowerText.includes("show to all");
  const isMasking = lowerText.includes("only show") || lowerText.match(/(rows|columns|stubs).*selected/);
  return !isUnconditional && !isMasking;
}

// ==========================================
// 2. NODE BUILDER
// ==========================================

function buildNodes(
  validQuestions: Question[],
  logicMap: Record<string, QuestionLogic>,
  readableCondition: (node: LogicNode | null | undefined) => string
): { nodes: Node[]; termEdges: Edge[] } {
  const nodes: Node[] = [];
  const termEdges: Edge[] = [];

  validQuestions.forEach((question) => {
    const qId = question.id.toString();
    const logic = logicMap[qId];
    
    const rawShowText = (logic as any)?.rawShowText || (typeof logic?.show === 'string' ? logic.show : null);
    const finalLogicText = logic?.show && typeof logic.show !== 'string' ? readableCondition(logic.show) : rawShowText;
    const rawTermText = (logic as any)?.rawTerminateText || (typeof logic?.terminate === 'string' ? logic.terminate : null);

    nodes.push({
      id: qId,
      type: "questionNode",
      position: { x: 0, y: 0 },
      data: {
        label: question.name,
        fullName: question.name,
        type: question.type,
        sectionName: question.sectionName,
        hasLogic: !!logic?.show || !!logic?.terminate || !!finalLogicText,
        logicText: finalLogicText,
        isBranchingLogic: isNodeBranching(finalLogicText),
      },
    });

    if (logic?.terminate || rawTermText) {
      nodes.push({
        id: `TERM-${qId}`,
        type: "output",
        position: { x: 0, y: 0 },
        data: { label: "🛑 TERMINATE", logicText: rawTermText },
        className: "bg-red-50 border border-red-500 text-red-700 text-xs w-[250px] text-left rounded shadow-sm z-10 p-2",
      });
      termEdges.push({
        id: `e-term-${qId}`,
        source: qId,
        target: `TERM-${qId}`,
        sourceHandle: "bottom-s", targetHandle: "top-t",
        type: "smoothstep",
        style: { stroke: "#ef4444", strokeWidth: 2, strokeDasharray: "4 4" },
      });
    }
  });

  return { nodes, termEdges };
}

// ==========================================
// 3. EDGE ROUTER (Upgraded)
// ==========================================

function buildRoutingEdges(
  validQuestions: Question[], 
  nodes: Node[], 
  logicMap: Record<string, QuestionLogic>
): Edge[] {
  const edges: Edge[] = [];
  const edgeSet = new Set<string>();

  const safePushEdge = (edge: Edge) => {
    const key = `${edge.source}->${edge.target}`;
    if (!edgeSet.has(key)) {
      edgeSet.add(key);
      edges.push(edge);
    }
  };

  let lastUnconditionalId: string | null = null;
  const activeTails = new Map<string, string>(); 
  let openBranches: string[] = []; 
  const validIds = validQuestions.map(q => q.id.toString());

  validQuestions.forEach((question, currentIndex) => {
    const qId = question.id.toString();
    const node = nodes.find(n => n.id === qId);
    if (!node) return;

    const isBranch = node.data.isBranchingLogic;
    const logicTxt = node.data.logicText || "unknown";

    if (!isBranch) {
      if (lastUnconditionalId) {
        safePushEdge({
          id: `seq-${lastUnconditionalId}-${qId}`,
          source: lastUnconditionalId, target: qId,
          sourceHandle: "right-s", targetHandle: "left-t",
          type: "smoothstep", style: { stroke: "#9ca3af", strokeWidth: 2 },
        });
      }

      openBranches.forEach((tailId) => {
        safePushEdge({
          id: `merge-${tailId}-${qId}`,
          source: tailId, target: qId,
          sourceHandle: "right-s", targetHandle: "left-t",
          type: "smoothstep", style: { stroke: "#9ca3af", strokeWidth: 2 },
        });
      });

      openBranches = []; 
      activeTails.clear(); 
      lastUnconditionalId = qId;
      
    } else {
      if (activeTails.has(logicTxt)) {
        const tailId = activeTails.get(logicTxt)!;
        safePushEdge({
          id: `seq-${tailId}-${qId}`,
          source: tailId, target: qId,
          sourceHandle: "right-s", targetHandle: "left-t",
          type: "smoothstep", style: { stroke: "#9ca3af", strokeWidth: 2 },
        });
        
        activeTails.set(logicTxt, qId);
        openBranches = openBranches.filter(id => id !== tailId);
        openBranches.push(qId);
      } else {
        // THE FIX: Use the new Closest Parent Extractor!
        const closestParentId = extractClosestParentId(
          logicMap[qId]?.show, 
          logicTxt, 
          validIds, 
          currentIndex
        );

        if (closestParentId) {
          safePushEdge({
            id: `dep-${closestParentId}-${qId}`,
            source: closestParentId, target: qId,
            sourceHandle: "right-s", targetHandle: "left-t",
            type: "smoothstep", animated: true,
            style: { stroke: "#3b82f6", strokeWidth: 2 }, 
          });
        } else if (lastUnconditionalId) {
          safePushEdge({
            id: `fallback-${lastUnconditionalId}-${qId}`,
            source: lastUnconditionalId, target: qId,
            sourceHandle: "right-s", targetHandle: "left-t",
            type: "smoothstep", animated: true,
            style: { stroke: "#3b82f6", strokeWidth: 2, strokeDasharray: "5 5" },
          });
        }
        activeTails.set(logicTxt, qId);
        openBranches.push(qId);
      }
    }
  });

  return edges;
}

// ==========================================
// 4. LAYOUT ENGINE (Dagre)
// ==========================================

function applyDagreLayout(nodes: Node[], edges: Edge[]): Node[] {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: 'LR', ranksep: 100, nodesep: 60 });

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

  return nodes.map((node) => {
    if (node.id.startsWith("TERM-")) {
      const parentId = node.id.replace("TERM-", "");
      const parentPos = dagreGraph.node(parentId);
      if (parentPos) {
        return {
          ...node,
          position: {
            x: parentPos.x - NODE_WIDTH / 2, 
            y: (parentPos.y - NODE_HEIGHT / 2) + NODE_HEIGHT + 15, 
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
}

// ==========================================
// 5. BOUNDING BOX GENERATOR
// ==========================================

function buildBoundingBoxes(layoutedNodes: Node[], validQuestions: Question[], blocks: Record<string, SurveyBlock>): Node[] {
  const boxNodes: Node[] = [];
  
  const structuralBlocks = Object.values(blocks || {}).filter(b => {
    const isLoop = b.type === "Loop";
    const hasSpecialLogic = b.logicText && b.logicText.trim() !== "";
    const isStandardBlock = ["Subsection", "Section", "Page"].includes(b.type);
    return isLoop || (isStandardBlock && hasSpecialLogic);
  });

  structuralBlocks.forEach((block) => {
    const blockQuestionIds = validQuestions
      .filter(q => q.parentBlocks.includes(block.id))
      .map(q => q.id.toString());

    const nodesInThisBlock = layoutedNodes.filter(n => blockQuestionIds.includes(n.id));

    if (nodesInThisBlock.length > 0) {
      const xs = nodesInThisBlock.map(n => n.position.x);
      const ys = nodesInThisBlock.map(n => n.position.y);

      const minX = Math.min(...xs);
      const maxX = Math.max(...xs) + NODE_WIDTH; 
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys) + NODE_HEIGHT;

      let padding = 20;
      let bgColor = 'rgba(243, 244, 246, 0.4)';
      let borderColor = '#9ca3af';
      let textColor = '#4b5563';
      let prefix = '';

      if (block.type === 'Loop') {
        padding = 20; 
        bgColor = 'rgba(255, 237, 213, 0.4)'; 
        borderColor = '#f97316';
        textColor = '#c2410c';
        prefix = '↻ ';
      } else if (block.type === 'Subsection') {
        padding = 45; 
        bgColor = 'rgba(224, 242, 254, 0.4)'; 
        borderColor = '#0ea5e9';
        textColor = '#0369a1';
        prefix = '◫ ';
      } else {
        padding = 70; 
        bgColor = 'rgba(243, 244, 246, 0.6)'; 
        borderColor = '#6b7280';
        textColor = '#374151';
        prefix = '📄 ';
      }

      const logicPad = block.logicText ? 45 : 10;
      const paddingTop = padding + logicPad;

      const labelText = `${prefix}${block.name}${block.logicText ? `\n[Logic: ${block.logicText}]` : ''}`;

      boxNodes.push({
        id: `box-${block.id}`,
        type: 'default',
        position: { x: minX - padding, y: minY - paddingTop },
        data: { label: labelText },
        style: {
          width: (maxX - minX) + (padding * 2),
          height: (maxY - minY) + paddingTop + padding,
          zIndex: -1, 
          backgroundColor: bgColor, 
          border: `2px dashed ${borderColor}`,
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
          padding: '12px 20px',
          color: textColor,
          fontWeight: 'bold',
          fontSize: '14px',
          whiteSpace: 'pre-wrap', 
          pointerEvents: 'none', 
        },
        draggable: false, selectable: false,
      });
    }
  });

  return boxNodes.sort((a, b) => (b.style?.width as number) - (a.style?.width as number));
}

// ==========================================
// 6. MAIN EXPORT
// ==========================================

export function getLayoutedGraph(
  refinedQuestions: Question[],
  logicMap: Record<string, QuestionLogic>,
  blocks: Record<string, SurveyBlock>,
  readableCondition: (node: LogicNode | null | undefined) => string
): { nodes: Node[]; edges: Edge[] } {
  
  const validQuestions = refinedQuestions.filter(q => q.type !== "Structural Marker");

  const { nodes, termEdges } = buildNodes(validQuestions, logicMap, readableCondition);
  const routingEdges = buildRoutingEdges(validQuestions, nodes, logicMap);
  
  const allEdges = [...termEdges, ...routingEdges];
  const layoutedNodes = applyDagreLayout(nodes, allEdges);

  const boundingBoxes = buildBoundingBoxes(layoutedNodes, validQuestions, blocks);

  const finalNodes = [...boundingBoxes, ...layoutedNodes];

  return { nodes: finalNodes, edges: allEdges };
}