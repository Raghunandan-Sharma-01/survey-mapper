import { LogicNode, LogicLeaf, ComparisonOperator, LogicalOperator } from "../../types/logic";
import { isShowToAll, isMaskingLogic } from "../logicHelpers";

// Global: finds EVERY "selected <...> [codes] at|in|from QID", so multiple
// show lines / sentences are all captured (not just the first).
const LEAF_RE = /(not\s+)?select(?:ed)?\b([^[\]]*?)\[([^\]]*)\]\s+(?:at|in|from)\s+([a-zA-Z0-9_]+)/gi;

function toLeaf(neg: string | undefined, mid: string, codesRaw: string, qid: string): LogicLeaf {
  const codes = codesRaw.split(/[,;/]/).map((c) => c.trim()).filter(Boolean);
  const atLeast = /at least|any of|one or more/i.test(mid);
  const operator = neg
    ? ComparisonOperator.NOT_SELECTED
    : atLeast
    ? ComparisonOperator.IN
    : ComparisonOperator.SELECTED;
  return {
    type: "leaf",
    questionId: qid.trim(),
    questionFullName: qid.trim(),
    operator,
    path: null,
    value: codes.length > 1 ? codes : codes[0] ?? codesRaw.trim(),
  };
}

export function parseTextToLogicNode(text: string | null): LogicNode | null {
  if (!text) return null;
  if (isShowToAll(text)) return null;
  if (isMaskingLogic(text)) return null;

  const leaves: LogicLeaf[] = [];
  let m: RegExpExecArray | null;
  LEAF_RE.lastIndex = 0;
  while ((m = LEAF_RE.exec(text)) !== null) {
    leaves.push(toLeaf(m[1], m[2] || "", m[3] || "", m[4]));
  }

  if (leaves.length === 0) return null;
  if (leaves.length === 1) return leaves[0];
  const operator = /\bor\b/i.test(text) ? LogicalOperator.OR : LogicalOperator.AND;
  return { type: "branch", operator, children: leaves };
}