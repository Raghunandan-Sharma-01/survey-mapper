/**
 * Question extraction from HTML content
 * Parses questions, options, and logic from HTML table structure
 */

import { ConvertedQuestion } from "../../types/logic";
import {
  ParsingState,
  looksLikeQuestionRow,
} from "./htmlElementProcessor";

/**
 * Detects the column index of question ID in table row
 */
export function detectQuestionIdIndex(row: string[]): number {
  const explicitIdIndex = row.findIndex(
    (c) => c.match(/^[A-Za-z_]+[A-Za-z0-9_]*\.$/) && !c.match(/^\d+\.$/),
  );
  if (explicitIdIndex !== -1) return explicitIdIndex;

  const numericIndex = row.findIndex((c) => c.match(/^\d+\.$/));
  if (numericIndex !== -1 && looksLikeQuestionRow(row)) {
    return numericIndex;
  }

  return -1;
}

/**
 * Creates a new question object from table row
 */
export function createNewQuestion(
  row: string[],
  idIndex: number,
  state: ParsingState,
): ConvertedQuestion {
  const qId = row[idIndex].replace(".", "");
  const qText = row[idIndex + 1] || "";

  let inlineName = state.pendingName;
  let inlineShow = state.pendingShow;
  let inlineTerm = state.pendingTerminate;

  if (idIndex > 0) {
    const nameMatch = row[0].match(/^\[([^\]]+)\]/);
    if (nameMatch) inlineName = nameMatch[1];

    const logicStr = row.slice(0, idIndex).join(" ");
    if (logicStr.toLowerCase().includes("show")) {
      inlineShow = logicStr.replace(/^\[[^\]]+\][,\s-]*/, "");
    }
    if (logicStr.toLowerCase().includes("terminate")) {
      inlineTerm = logicStr;
    }
  }

  return {
    id: qId,
    name: inlineName || qId,
    type: "Multiple Choice",
    text: qText,
    parentBlocks: [],
    showLogic: { text: inlineShow || null, condition: null },
    terminateLogic: { text: inlineTerm || null, condition: null },
    options: [],
  };
}