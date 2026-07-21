import { ConvertedQuestion, LogicNode, LogicLeaf, ComparisonOperator } from "../../types/logic";
import { parseTextToLogicNode } from "../../utils/htmlParsing/logicParser";

export interface PaletteColor { solid: string; tint: string; }
export interface Leaf { questionId: string; op: ComparisonOperator; codes: string[]; }
export interface QDep {
  q: ConvertedQuestion; index: number; leaves: Leaf[]; branchOp: "AND" | "OR" | null;
  loop: string | null; isMarker: boolean; hasStubLogic: boolean;
  terminate: string | null; termLabel: string | null;
}
export interface DependencyModel {
  items: QDep[]; colorByKey: Record<string, PaletteColor>;
  loopColor: Record<string, PaletteColor>; depCount: Record<string, number>;
}
export const colorAt = (i: number): PaletteColor => {
  const hue = Math.round((i * 137.508) % 360);
  return { solid: `hsl(${hue},65%,45%)`, tint: `hsl(${hue},70%,96%)` };
};
const SYM: Record<string, string> = {
  [ComparisonOperator.SELECTED]: "=", [ComparisonOperator.NOT_SELECTED]: "≠", [ComparisonOperator.IN]: "∈",
  [ComparisonOperator.GT]: ">", [ComparisonOperator.LT]: "<", [ComparisonOperator.GTE]: "≥",
  [ComparisonOperator.LTE]: "≤", [ComparisonOperator.ALL]: "ALL",
};
export const opSym = (o: ComparisonOperator) => SYM[o] ?? o;
export const branchKey = (l: Leaf) => `${l.questionId}|${l.op}|${l.codes.join(",")}`;
export const branchLabel = (l: Leaf) => `${l.questionId} ${opSym(l.op)} ${l.codes.join(", ")}`;

function collect(node: LogicNode | null): { leaves: Leaf[]; op: "AND" | "OR" | null } {
  const leaves: Leaf[] = [];
  const walk = (n: LogicNode) => {
    if (n.type === "leaf") leaves.push({ questionId: n.questionId, op: n.operator, codes: Array.isArray(n.value) ? n.value.map(String) : [String(n.value)] });
    else n.children.forEach(walk);
  };
  if (node) walk(node);
  return { leaves, op: node && node.type === "branch" ? (node.operator as "AND" | "OR") : null };
}
const hasStub = (q: ConvertedQuestion) =>
  (q.options || []).some((o) => o.showLogic?.text || o.terminateLogic?.text || o.isExclusive || o.isAnchor);

export function buildDependencyModel(questions: ConvertedQuestion[]): DependencyModel {
  const items: QDep[] = []; let loop: string | null = null;
  questions.forEach((q, i) => {
    if (q.type === "Structural Marker") {
      const s = q.name.match(/^loop\s*start\s*[-–]\s*(.+)$/i);
      if (s) loop = s[1].trim(); else if (/^loop\s*end/i.test(q.name)) loop = null;
      items.push({ q, index: i, leaves: [], branchOp: null, loop: null, isMarker: true, hasStubLogic: false, terminate: null, termLabel: null });
      return;
    }
    const { leaves, op } = collect(parseTextToLogicNode(q.showLogic?.text ?? null));
    const termLeaf = collect(parseTextToLogicNode(q.terminateLogic?.text ?? null)).leaves[0];
    items.push({
      q, index: i, leaves, branchOp: op, loop, isMarker: false,
      hasStubLogic: !!hasStub(q),
      terminate: q.terminateLogic?.text ?? null,
      termLabel: termLeaf ? branchLabel(termLeaf) : null,
    });
  });
  const keys = new Set<string>(); const depCount: Record<string, number> = {};
  items.forEach((it) => it.leaves.forEach((l) => { keys.add(branchKey(l)); depCount[l.questionId] = (depCount[l.questionId] || 0) + 1; }));
  const colorByKey: Record<string, PaletteColor> = {}; let ci = 0;
  [...keys].sort().forEach((k) => (colorByKey[k] = colorAt(ci++)));
  const loopNames = [...new Set(items.filter(i => i.isMarker).map(i => i.q.name.match(/^loop\s*start\s*[-–]\s*(.+)$/i)?.[1]?.trim()).filter(Boolean) as string[])];
  const loopColor: Record<string, PaletteColor> = {}; loopNames.forEach((n) => (loopColor[n] = colorAt(ci++)));
  return { items, colorByKey, loopColor, depCount };
}
export function primaryLeaf(leaves: Leaf[], depCount: Record<string, number>): Leaf | null {
  if (!leaves.length) return null;
  return [...leaves].sort((a, b) => (depCount[b.questionId] || 0) - (depCount[a.questionId] || 0))[0];
}