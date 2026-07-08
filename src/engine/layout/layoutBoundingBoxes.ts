import { Node } from "reactflow";
import { Question, SurveyBlock } from "../../types/logic";
import { cleanLogicText } from "./layoutPreparation";
import { NODE_W, NODE_H } from "./layoutConstants";

export function buildBoundingBoxes(
  layoutedNodes: Node[],
  validQuestions: Question[],
  blocks: Record<string, SurveyBlock>
): Node[] {
  const boxNodes: Node[] = [];

  const structuralBlocks = Object.values(blocks || {}).filter((b) => {
    const isLoop = b.type === "Loop";
    const hasSpecialLogic = b.logicText && b.logicText.trim() !== "";
    const isStandardBlock = ["Subsection", "Section", "Page"].includes(b.type);
    return isLoop || (isStandardBlock && hasSpecialLogic);
  });

  structuralBlocks.forEach((block) => {
    const blockQuestionIds = validQuestions
      .filter((q) => q.parentBlocks.includes(block.id))
      .map((q) => q.id.toString());

    const nodesInThisBlock = layoutedNodes.filter((n) => {
      const owner = n.id.replace(/^TERM-/, "");
      return blockQuestionIds.includes(owner);
    });

    if (nodesInThisBlock.length === 0) return;

    const xs = nodesInThisBlock.map((n) => n.position.x);
    const ys = nodesInThisBlock.map((n) => n.position.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs) + NODE_W;
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys) + NODE_H;

    let padding = 20;
    let bgColor = "rgba(243, 244, 246, 0.4)";
    let borderColor = "#9ca3af";
    let textColor = "#4b5563";
    let prefix = "";

    if (block.type === "Loop") {
      padding = 25;
      bgColor = "rgba(255, 237, 213, 0.4)";
      borderColor = "#f97316";
      textColor = "#c2410c";
      prefix = "↻ ";
    } else if (block.type === "Subsection") {
      padding = 40;
      bgColor = "rgba(224, 242, 254, 0.4)";
      borderColor = "#0ea5e9";
      textColor = "#0369a1";
      prefix = "◫ ";
    } else {
      padding = 55;
      bgColor = "rgba(243, 244, 246, 0.6)";
      borderColor = "#6b7280";
      textColor = "#374151";
      prefix = "📄 ";
    }

    const logicText = cleanLogicText(block.logicText);
    const paddingTop = padding + (logicText ? 40 : 10);
    const labelText = `${prefix}${block.name}${
      logicText ? `\n[Logic: ${logicText}]` : ""
    }`;

    boxNodes.push({
      id: `box-${block.id}`,
      type: "default",
      position: { x: minX - padding, y: minY - paddingTop },
      data: { label: labelText },
      style: {
        width: maxX - minX + padding * 2,
        height: maxY - minY + paddingTop + padding,
        zIndex: -1,
        backgroundColor: bgColor,
        border: `2px dashed ${borderColor}`,
        borderRadius: "12px",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "flex-start",
        padding: "10px 16px",
        color: textColor,
        fontWeight: "bold",
        fontSize: "13px",
        whiteSpace: "pre-wrap",
        pointerEvents: "none",
      },
      draggable: false,
      selectable: false,
    });
  });

  const width = (n: Node) => Number(n.style?.width) || 0;
  return boxNodes.sort((a, b) => width(b) - width(a));
}
