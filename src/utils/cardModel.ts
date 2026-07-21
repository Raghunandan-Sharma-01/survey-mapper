import { ConvertedQuestion, LogicNode, LogicLeaf, ComparisonOperator } from "../types/logic";
import { parseTextToLogicNode } from "./htmlParsing/logicParser";

export interface PaletteColor { solid: string; tint: string; }
export interface DepTag { key: string; label: string; color: PaletteColor; }
export interface QuestionCard {
  id: string; label: string; type: string;
  isSource: boolean; dependentCount: number;
  isLoopAnchor: boolean;
  accent: PaletteColor | null;   // left-bar color
  swatches: PaletteColor[];      // branch colors this source drives
  branchOp: "AND" | "OR" | null;
  tags: DepTag[];
}

const NEUTRAL: PaletteColor = { solid: "#334155", tint: "#e2e8f0" };

// Unlimited, deterministic, well-separated colors (golden-angle hue rotation).
function colorAt(i: number): PaletteColor {
  const hue = Math.round((i * 137.508) % 360);
  return { solid: `hsl(${hue}, 65%, 45%)`, tint: `hsl(${hue}, 70%, 95%)` };
}

const OP_SYMBOL: Record<string, string> = {
  [ComparisonOperator.SELECTED]: "=",
  [ComparisonOperator.NOT_SELECTED]: "≠",
  [ComparisonOperator.IN]: "∈",
  [ComparisonOperator.ALL]: "ALL",
  [ComparisonOperator.GT]: ">",
  [ComparisonOperator.LT]: "<",
  [ComparisonOperator.GTE]: "≥",
  [ComparisonOperator.LTE]: "≤",
};

function leaves(node: LogicNode | null, acc: LogicLeaf[] = []): LogicLeaf[] {
  if (!node) return acc;
  if (node.type === "leaf") acc.push(node);
  else node.children.forEach((c) => leaves(c, acc));
  return acc;
}
const codes = (l: LogicLeaf) => (Array.isArray(l.value) ? l.value.join(",") : String(l.value ?? ""));
const branchKey = (l: LogicLeaf) => `${l.questionId}|${l.operator}|${codes(l)}`;
function leafLabel(l: LogicLeaf): string {
  const v = Array.isArray(l.value) ? l.value.join(", ") : String(l.value ?? "");
  return `${l.questionId} ${OP_SYMBOL[l.operator] ?? l.operator} ${v}`.trim();
}

export function buildCardModel(questions: ConvertedQuestion[]): QuestionCard[] {
  const parsed = questions.map((q) => {
    const isMarker = q.type === "Structural Marker";
    const node = isMarker ? null : parseTextToLogicNode(q.showLogic?.text ?? null);
    return { q, isMarker, node, ls: leaves(node) };
  });

  const dependents: Record<string, number> = {};
  const branchKeys = new Set<string>();
  parsed.forEach((p) =>
    p.ls.forEach((l) => {
      dependents[l.questionId] = (dependents[l.questionId] || 0) + 1;
      branchKeys.add(branchKey(l));
    })
  );

  const loopNames: string[] = [];
  parsed.forEach((p) => {
    if (!p.isMarker) return;
    const m = p.q.name.match(/^loop\s*start\s*[-–]\s*(.+)$/i);
    if (m) loopNames.push(m[1].trim());
  });

  // Colors: one per distinct source+stub branch, then one per loop.
  const colorOf: Record<string, PaletteColor> = {};
  let ci = 0;
  [...branchKeys].sort().forEach((k) => (colorOf[k] = colorAt(ci++)));
  const loopColor: Record<string, PaletteColor> = {};
  loopNames.forEach((n) => (loopColor[n] = colorAt(ci++)));

  const cards: QuestionCard[] = [];
  let currentLoop: string | null = null;

  for (const p of parsed) {
    if (p.isMarker) {
      const name = p.q.name;
      const start = name.match(/^loop\s*start\s*[-–]\s*(.+)$/i);
      if (start) { currentLoop = start[1].trim(); continue; }
      if (/^loop\s*end/i.test(name)) { currentLoop = null; continue; }
      if (/show if|terminate|delay/i.test(name)) {
        cards.push({ id: p.q.id, label: name, type: "Section", isSource: false,
          dependentCount: 0, isLoopAnchor: false, accent: null, swatches: [], branchOp: null, tags: [] });
      }
      continue; // plain section/subsection markers dropped
    }

    const isLoopAnchor = !!currentLoop && (p.q.id === currentLoop || p.q.name === currentLoop);
    const tags: DepTag[] = p.ls.map((l) => ({ key: branchKey(l), label: leafLabel(l), color: colorOf[branchKey(l)] }));
    if (currentLoop && !isLoopAnchor) {
      tags.unshift({ key: "loop:" + currentLoop, label: "⟳ " + currentLoop, color: loopColor[currentLoop] });
    }

    const isSource = (dependents[p.q.id] || 0) > 0;
    const swatches = [...branchKeys].filter((k) => k.startsWith(p.q.id + "|")).map((k) => colorOf[k]);

    cards.push({
      id: p.q.id, label: p.q.id, type: p.q.type,
      isSource, dependentCount: dependents[p.q.id] || 0,
      isLoopAnchor,
      accent: isLoopAnchor ? loopColor[currentLoop!] : isSource ? NEUTRAL : null,
      swatches,
      branchOp: p.node && p.node.type === "branch" ? (p.node.operator as "AND" | "OR") : null,
      tags,
    });
  }

  return cards;
}