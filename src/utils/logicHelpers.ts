// utils/logicHelpers.ts

import {
  Question,
  QuestionLogic,
  LogicNode,
  LogicBranch,
  LogicalOperator,
} from "../types/logic";

export function isShowToAll(logicText: string | null | undefined): boolean {
  return !!logicText && /show to all/i.test(logicText);
}

export function isMaskingLogic(logicText: string | null | undefined): boolean {
  if (!logicText) return false;
  return (
    /only show/i.test(logicText) ||
    /(rows|columns|stubs).*selected/i.test(logicText) ||
    /\blimit\b[\s\S]*\boptions?\b/i.test(logicText) ||
    /\b(at\s?most|up\s?to)\b[\s\S]*\boptions?\b/i.test(logicText)
  );
}

export function stripProgrammerComment(
  text: string | null | undefined
): string | null {
  if (!text) return null;
  const cleaned = text
    .split("\n")
    .map((line) =>
      line
        .replace(/programmer\s*comment.*$/i, "")
        .replace(/note to client.*$/i, "")
        .trim()
    )
    .filter((line) => line.length > 0)
    .filter((line) => !isMaskingLogic(line))
    .join("\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
  return cleaned.length ? cleaned : null;
}

export function resolveEffectiveLogic(
  targetQuestionId: string,
  refinedQuestions: Question[],
  logicMap: Record<string, QuestionLogic>
): QuestionLogic {
  const targetQuestion = refinedQuestions.find(
    (question) => question.id.toString() === targetQuestionId.toString()
  );
  if (!targetQuestion) return {};

  const inheritedConditions: LogicNode[] = [];

  targetQuestion.parentBlocks.forEach((blockId) => {
    const blockLogic = logicMap[blockId]?.show;
    if (blockLogic) inheritedConditions.push(blockLogic);
  });

  const questionOwnLogic = logicMap[targetQuestionId]?.show;
  if (questionOwnLogic) inheritedConditions.push(questionOwnLogic);

  const terminateLogic = logicMap[targetQuestionId]?.terminate;

  if (inheritedConditions.length === 0) return { show: null, terminate: terminateLogic };
  if (inheritedConditions.length === 1) return { show: inheritedConditions[0], terminate: terminateLogic };

  const mergedShowLogic: LogicBranch = {
    type: "branch",
    operator: LogicalOperator.AND,
    children: inheritedConditions,
  };
  return { show: mergedShowLogic, terminate: terminateLogic };
}

export const readableCondition = (node: LogicNode | null | undefined): string => {
  if (!node) return "";

  if (node.type === "leaf") {
    let targetStr = "";
    if (Array.isArray(node.value) && node.value.length > 0) {
      targetStr = `[${node.value.join(", ")}]`;
    } else if (node.value !== undefined && node.value !== null && node.value !== "") {
      targetStr = String(node.value);
    } else if (node.path) {
      targetStr = node.path;
    }
    return `${node.questionFullName || node.questionId} ${node.operator} ${targetStr}`.trim();
  }

  if (node.type === "branch") {
    const childStrs = node.children.map((c) => readableCondition(c));
    const joined = childStrs.join(` ${node.operator} `);
    if (!joined) return "";
    return node.isNegated ? `NOT (${joined})` : `(${joined})`;
  }

  return "";
};

// --- added: referenced question ids (for the dotted logic layer) -------------
export function collectQuestionRefs(node: LogicNode | null | undefined): string[] {
  const out = new Set<string>();
  const visit = (n: LogicNode) => {
    if (n.type === "leaf") out.add(n.questionId);
    else n.children.forEach(visit);
  };
  if (node) visit(node);
  return [...out];
}

// --- added: canonical signature (for grouping same-logic children) -----------
export function logicSignature(node: LogicNode | null | undefined): string {
  if (!node) return "";
  if (node.type === "leaf") {
    const val = Array.isArray(node.value)
      ? [...node.value].map(String).sort().join(",")
      : String(node.value ?? "");
    return `L:${node.questionId}|${node.path ?? ""}|${node.operator}|${val}`;
  }
  const kids = node.children.map(logicSignature).sort();
  return `${node.isNegated ? "!" : ""}B:${node.operator}(${kids.join("&")})`;
}