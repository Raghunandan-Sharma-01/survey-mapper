/**
 * Question extraction from HTML content
 * Parses questions, options, and logic from HTML table structure
 */

import { ConvertedQuestion } from "../../types/logic";
import {
  ParsingState,
  looksLikeQuestionRow,
} from "./htmlElementProcessor";
import { stripProgrammerComment } from "../logicHelpers";

/**
 * Detects the column index of question ID in table row
 */
export function detectQuestionIdIndex(row: string[]): number {
  const explicitIdIndex = row.findIndex((c) => {
    const trimmed = c.trim();
    
    // 1. Must match the Question ID pattern (Letters/Underscores ending in a dot)
    if (!trimmed.match(/^[A-Za-z_]+[A-Za-z0-9_]*\.$/)) return false;
    
    // 2. Must not be purely numeric
    if (trimmed.match(/^\d+\.$/)) return false;
    
    // 3. THE FIX: Ignore metadata keywords that accidentally match the ID pattern
    if (/^(EXCLUSIVE|ANCHOR|RANDOMIZE|DEFAULT)\.?$/i.test(trimmed)) return false;
    
    return true;
  });

  if (explicitIdIndex !== -1) return explicitIdIndex;

  const numericIndex = row.findIndex((c) => c.match(/^\d+\.$/));
  if (numericIndex !== -1 && looksLikeQuestionRow(row)) {
    return numericIndex;
  }

  return -1;
}

export function createNewQuestion(row: string[], idIndex: number, state: ParsingState): ConvertedQuestion {
  let qId = row[idIndex].replace(".", "");
  const qText = row[idIndex + 1] || "";

  let inlineName = state.pendingName;
  let inlineShow = state.pendingShow;
  let inlineTerm = state.pendingTerminate;

  if (idIndex > 0) {
    const nameMatch = row[0].match(/^\[([^\]]+)\]/);
    if (nameMatch) inlineName = nameMatch[1];
    const logicStr = row.slice(0, idIndex).join(" ");
    if (logicStr.toLowerCase().includes("show")) inlineShow = logicStr.replace(/^\[[^\]]+\][,\s-]*/, "");
    if (logicStr.toLowerCase().includes("terminate")) inlineTerm = logicStr;
  }

  // FIX: Display Text (DT.) typed correctly instead of "Multiple Choice".
  let qType = "Multiple Choice";
  if (/^DT/i.test(qId)) qType = "Display Text";

  if (qId === "DT" && inlineName) qId = `DT_${inlineName.replace(/[^A-Za-z0-9]/g, "")}`;

  // FIX: clean comments / notes / masking out of stored logic text.
  const cleanShow = stripProgrammerComment(inlineShow);
  const cleanTerm = stripProgrammerComment(inlineTerm);

  return {
    id: qId, name: inlineName || qId, type: qType, text: qText, parentBlocks: [],
    showLogic: { text: cleanShow || null, condition: null },
    terminateLogic: { text: cleanTerm || null, condition: null },
    options: [],
  };
}