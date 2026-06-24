import { Node, Edge } from "reactflow";
import { Question, QuestionLogic, SurveyBlock, LogicNode } from "../types/logic";

const NODE_WIDTH = 250;
const NODE_HEIGHT = 120;

// ==========================================
// 1. UTILITIES
// ==========================================

function isNodeBranching(logicText: string | null): boolean {
  if (!logicText) return false;
  const lowerText = logicText.toLowerCase();
  
  if (lowerText.includes("show if") || lowerText.includes("ask if")) {
    return true;
  }
  
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
    let finalLogicText = logic?.show && typeof logic.show !== 'string' ? readableCondition(logic.show) : rawShowText;
    const rawTermText = (logic as any)?.rawTerminateText || (typeof logic?.terminate === 'string' ? logic.terminate : null);

    // Treat "Show to all" exactly like an empty node!
    if (finalLogicText) {
      const lowerText = finalLogicText.toLowerCase();
      if (lowerText.includes("show to all") && !lowerText.includes("only show") && !lowerText.match(/(rows|columns|stubs).*selected/)) {
        finalLogicText = null; 
      }
    }

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
        // Shrunk the width to 160px and centered the text
        className: "bg-red-50 border border-red-500 text-red-700 text-xs w-[160px] text-center rounded shadow-sm z-10 p-2",
      });
      termEdges.push({
        id: `e-term-${qId}`,
        source: qId,
        target: `TERM-${qId}`,
        sourceHandle: "bottom-s", targetHandle: "top-t",
        // Switched to 'step' so it draws a rigid, distinct 90-degree angle
        type: "step",
        style: { stroke: "#ef4444", strokeWidth: 2, strokeDasharray: "4 4" },
      });
    }
  });

  return { nodes, termEdges };
}

// ==========================================
// 3. CUSTOM GRID/SNAKE & FAN-OUT ENGINE
// ==========================================

function applyCustomLevelLayout(nodes: Node[]): Node[] {
  const MAX_COLS = 5; 
  const GAP_X = 80;
  const GAP_Y = 160; 

  const positionedNodes: Node[] = [];
  const realNodes = nodes.filter(n => !n.id.startsWith("TERM-"));

  interface Chunk {
    logicText: string | null;
    isSpine: boolean;
    nodes: Node[];
  }
  const chunks: Chunk[] = [];
  let currentChunk: Node[] = [];
  let currentLogic = realNodes[0]?.data.logicText || null;
  let currentIsSpine = !realNodes[0]?.data.isBranchingLogic;

  realNodes.forEach(node => {
    const nodeLogic = node.data.logicText || null;
    const isSpine = !node.data.isBranchingLogic;

    if (nodeLogic === currentLogic && isSpine === currentIsSpine) {
      currentChunk.push(node);
    } else {
      chunks.push({ logicText: currentLogic, isSpine: currentIsSpine, nodes: currentChunk });
      currentLogic = nodeLogic;
      currentIsSpine = isSpine;
      currentChunk = [node];
    }
  });
  if (currentChunk.length > 0) chunks.push({ logicText: currentLogic, isSpine: currentIsSpine, nodes: currentChunk });

  let globalY = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    if (chunk.isSpine) {
      // MAIN SPINE: Snake layout
      const startX = 0; 
      chunk.nodes.forEach((node, index) => {
        const col = index % MAX_COLS;
        const row = Math.floor(index / MAX_COLS);

        node.position = {
          x: startX + col * (NODE_WIDTH + GAP_X),
          y: globalY + row * (NODE_HEIGHT + GAP_Y)
        };
        positionedNodes.push(node);
      });

      const totalRowsForChunk = Math.ceil(chunk.nodes.length / MAX_COLS);
      globalY += totalRowsForChunk * (NODE_HEIGHT + GAP_Y);

    } else {
      // BRANCHES: Symmetrical Fan-Out
      const branchChunks = [chunk];
      while (i + 1 < chunks.length && !chunks[i+1].isSpine) {
        branchChunks.push(chunks[i+1]);
        i++; 
      }

      const numBranches = branchChunks.length;
      const colWidth = NODE_WIDTH + GAP_X;
      const totalWidth = numBranches * colWidth;
      
      const lastNode = positionedNodes.length > 0 ? positionedNodes[positionedNodes.length - 1] : null;
      const spineCenterX = lastNode ? lastNode.position.x : 0;
      
      const startX = spineCenterX - (totalWidth / 2) + (colWidth / 2);
      let maxBranchHeight = 0;

      branchChunks.forEach((bChunk, bIndex) => {
        const trackX = startX + bIndex * colWidth; 
        
        bChunk.nodes.forEach((node, nIndex) => {
          node.position = {
            x: trackX,
            y: globalY + nIndex * (NODE_HEIGHT + GAP_Y) 
          };
          positionedNodes.push(node);
        });
        
        maxBranchHeight = Math.max(maxBranchHeight, bChunk.nodes.length);
      });

      globalY += maxBranchHeight * (NODE_HEIGHT + GAP_Y);
    }
  }

  const termNodes = nodes.filter(n => n.id.startsWith("TERM-"));
  termNodes.forEach(term => {
    const parentId = term.id.replace("TERM-", "");
    const parentNode = positionedNodes.find(p => p.id === parentId);
    
    if (parentNode) {
      term.position = {
        // The center line drops at +125px. We place this at +140px so it perfectly dodges the blue lines!
        x: parentNode.position.x + 140, 
        y: parentNode.position.y + NODE_HEIGHT + 20 
      };
      positionedNodes.push(term);
    }
  });

  return positionedNodes;
}

// ==========================================
// 4. COORDINATE-AWARE EDGE ROUTER
// ==========================================

function buildRoutingEdges(validQuestions: Question[], positionedNodes: Node[]): Edge[] {
  const edges: Edge[] = [];
  const edgeSet = new Set<string>();

  // THE MAGIC: This dynamically chooses Top/Bottom or Left/Right handles based on grid positions!
  const addEdge = (sourceId: string, targetId: string, typePrefix: string, style: any, animated = false) => {
    const key = `${sourceId}->${targetId}`;
    if (edgeSet.has(key)) return;
    edgeSet.add(key);

    const sNode = positionedNodes.find(n => n.id === sourceId);
    const tNode = positionedNodes.find(n => n.id === targetId);

    let sHandle = "right-s";
    let tHandle = "left-t";

    if (sNode && tNode) {
      const dy = tNode.position.y - sNode.position.y;
      // If the target node is strictly on a lower row (Branch split, or Snake wrap)
      if (dy > 50) {
        sHandle = "bottom-s";
        tHandle = "top-t";
      }
    }

    edges.push({
      id: `${typePrefix}-${sourceId}-${targetId}`,
      source: sourceId,
      target: targetId,
      sourceHandle: sHandle,
      targetHandle: tHandle,
      type: "smoothstep",
      animated,
      style
    });
  };

  let lastUnconditionalId: string | null = null;
  const activeTails = new Map<string, string>(); 
  let openBranches: string[] = []; 

  validQuestions.forEach((question) => {
    const qId = question.id.toString();
    const node = positionedNodes.find(n => n.id === qId);
    if (!node) return;

    const isBranch = node.data.isBranchingLogic;
    const logicTxt = node.data.logicText || "unknown";

    if (!isBranch) {
      if (lastUnconditionalId) {
        addEdge(lastUnconditionalId, qId, "seq", { stroke: "#9ca3af", strokeWidth: 2 });
      }

      openBranches.forEach((tailId) => {
        addEdge(tailId, qId, "merge", { stroke: "#9ca3af", strokeWidth: 2 });
      });

      openBranches = []; 
      activeTails.clear(); 
      lastUnconditionalId = qId;
      
    } else {
      if (activeTails.has(logicTxt)) {
        const tailId = activeTails.get(logicTxt)!;
        addEdge(tailId, qId, "seq", { stroke: "#9ca3af", strokeWidth: 2 });
        activeTails.set(logicTxt, qId);
        openBranches = openBranches.filter(id => id !== tailId);
        openBranches.push(qId);
      } else {
        if (lastUnconditionalId) {
          addEdge(lastUnconditionalId, qId, "branch-start", { stroke: "#3b82f6", strokeWidth: 2 }, true);
        }
        activeTails.set(logicTxt, qId);
        openBranches.push(qId);
      }
    }
  });

  return edges;
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
        padding = 25; 
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
  
  const validQuestions = refinedQuestions.filter(q => 
    q.type !== "Structural Marker" && 
    !(q.name || "").toLowerCase().includes("[hidden]")
  );

  const { nodes, termEdges } = buildNodes(validQuestions, logicMap, readableCondition);
  
  // NOTE: Layout is now applied FIRST so the edges know exactly where they are drawing to!
  const layoutedNodes = applyCustomLevelLayout(nodes);
  
  const routingEdges = buildRoutingEdges(validQuestions, layoutedNodes);
  const allEdges = [...termEdges, ...routingEdges];

  const boundingBoxes = buildBoundingBoxes(layoutedNodes, validQuestions, blocks);

  const finalNodes = [...boundingBoxes, ...layoutedNodes];

  return { nodes: finalNodes, edges: allEdges };
}