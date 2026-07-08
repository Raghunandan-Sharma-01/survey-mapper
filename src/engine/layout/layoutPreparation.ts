// layout/layoutPreparation.ts

import { Question, QuestionLogic, LogicNode } from "../../types/logic";
import {
  isShowToAll,
  isMaskingLogic,
  stripProgrammerComment,
  resolveEffectiveLogic,
  collectQuestionRefs,
  logicSignature,
} from "../../utils/logicHelpers";

export interface Prepared {
  q: Question;
  showText: string | null;
  termText: string | null;
  cond: boolean;
  triggerIds: string[];    // gating questions (full effective set) — for logic layer
  ownTriggerIds: string[]; // gating questions from OWN show logic — for attachment
  logicSig: string;        // canonical signature of own show logic — for grouping
}

export interface Slot {
  spine: Prepared;
  detours: Prepared[];
}

export function cleanLogicText(text: string | null | undefined): string | null {
  if (!text) return null;
  let cleaned = stripProgrammerComment(text) ?? "";
  cleaned = cleaned.replace(/Programmer Comment\s*:?/gi, "").trim();
  return cleaned || null;
}

export function isConditional(logicText: string | null): boolean {
  if (!logicText) return false;
  const lower = logicText.toLowerCase();
  if (lower.includes("show if") || lower.includes("ask if")) return true;
  return !isShowToAll(logicText) && !isMaskingLogic(logicText);
}

export function prepare(
  q: Question,
  logicMap: Record<string, QuestionLogic>,
  readableCondition: (node: LogicNode | null | undefined) => string,
  refinedQuestions: Question[]
): Prepared {
  const logic = logicMap[q.id];

  const rawShow =
    logic?.rawShowText ?? (typeof logic?.show === "string" ? logic.show : null);
  let showText =
    logic?.show && typeof logic.show !== "string"
      ? readableCondition(logic.show)
      : rawShow;
  if (showText && isShowToAll(showText) && !isMaskingLogic(showText)) showText = null;
  showText = cleanLogicText(showText);

  const rawTerm =
    logic?.rawTerminateText ??
    (typeof logic?.terminate === "string" ? logic.terminate : null);
  const termText = cleanLogicText(rawTerm);

  // grouping key + attachment: the question's OWN show condition
  const ownShow =
    logic?.show && typeof logic.show !== "string" ? logic.show : null;
  const logicSig = logicSignature(ownShow);
  const ownTriggerIds = collectQuestionRefs(ownShow);

  // logic layer: FULL effective set (own + inherited Page/Section/Loop)
  const effectiveShow = resolveEffectiveLogic(q.id, refinedQuestions, logicMap).show;
  const triggerIds = collectQuestionRefs(effectiveShow);

  return {
    q, showText, termText,
    cond: isConditional(showText),
    triggerIds, ownTriggerIds, logicSig,
  };
}

// Position follows SEQUENCE: a conditional attaches to the slot immediately
// before it (its previous node), so it renders next to where it actually
// occurs in the flow. Its gate may be far away — that distance is shown only by
// the (hover) logic edge, never by relocating the node. groupByLogic then lays
// a slot's detours out in columns by shared condition.
export function groupSlots(prepared: Prepared[]): Slot[] {
  const slots: Slot[] = [];
  for (const p of prepared) {
    if (!p.cond || slots.length === 0) {
      slots.push({ spine: p, detours: [] });
    } else {
      slots[slots.length - 1].detours.push(p);
    }
  }
  return slots;
}

// Group a slot's detours by logicSig, preserving first-appearance order of
// both groups and members. Same condition -> one column (stacked); distinct
// conditions -> separate columns (siblings).
export function groupByLogic(detours: Prepared[]): Prepared[][] {
  const order: string[] = [];
  const map = new Map<string, Prepared[]>();
  for (const d of detours) {
    const key = d.logicSig ?? "";
    if (!map.has(key)) {
      map.set(key, []);
      order.push(key);
    }
    map.get(key)!.push(d);
  }
  return order.map((k) => map.get(k)!);
}

// Visual columns: split each logic group into sub-columns of <= maxDepth so a
// deep column wraps sideways instead of running far down the canvas. Preserves
// order. Used by both height sizing and detour routing so they agree.
export function toColumns(groups: Prepared[][], maxDepth: number): Prepared[][] {
  const cols: Prepared[][] = [];
  for (const g of groups) {
    for (let i = 0; i < g.length; i += maxDepth) cols.push(g.slice(i, i + maxDepth));
  }
  return cols;
}