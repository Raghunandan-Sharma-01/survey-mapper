/**
 * Option row processing for question options
 * Handles both single-cell and multi-cell option formats
 */

import { ConvertedQuestion } from "../../types/logic";
import {
  isMetadataRow,
  isOptionMarker,
  determineQuestionTypeFromText,
  isGridInstruction,
} from "./htmlElementProcessor";

/**
 * Main processor for option rows
 */
export function processOptionRow(
  row: string[],
  currentQuestion: ConvertedQuestion,
): void {
  const rowText = row.filter((c) => c !== "").join(" ");
  if (!rowText) return;

  // --- THE LOOKBACK CATCH ---
  // If this row is JUST an exclusive/anchor modifier, apply it to the previous option
  const upperRowText = rowText.toUpperCase();
  if (/^((?:EXCLUSIVE|ANCHOR|ALWAYS SHOWN)[.\s]*)+$/.test(upperRowText)) {
    const lastOption = currentQuestion.options[currentQuestion.options.length - 1];
    if (lastOption) {
      if (upperRowText.includes("EXCLUSIVE")) lastOption.isExclusive = true;
      if (upperRowText.includes("ANCHOR")) lastOption.isAnchor = true;
      if (upperRowText.includes("ALWAYS SHOWN")) lastOption.isAlwaysShown = true;
    }
    return;
  }
// Grid column-header row: a "COLS:"/"ROWS:" metadata cell followed by the
  // column labels. Column ids align to the per-column codes in the data rows (1..n).
  if (/^(COLS:|ROWS:)/i.test(row[0]?.trim() || "")) {
    const headers = row.slice(1).map((c) => c.trim()).filter((c) => c !== "");
    if (headers.length > 0) {
      currentQuestion.isGrid = true;
      currentQuestion.columns = headers.map((t, i) => ({ id: String(i + 1), text: t }));
    }
    return;
  }
// A stub-group line has no option marker but carries "Show if ... [XX] at QID".
  // Capture it and apply to the stubs that follow (until the next group line / question).
  const hasMarker = row.some((c) => isOptionMarker(c));
  if (!hasMarker && /show if|only show|autocode/i.test(rowText)) {
    (currentQuestion as any)._grp = rowText.replace(/^(default order|randomize list)\.?\s*/i, "").trim();
    return;
  }

  // Ignore metadata rows
  if (isMetadataRow(rowText)) return;

  // Determine question type from row and update current question
  const questionType = determineQuestionTypeFromText(rowText);
  if (questionType !== "Multiple Choice") currentQuestion.type = questionType;
  // Grid-ness is orthogonal to response type (single / multi / numeric grid).
  if (isGridInstruction(rowText)) currentQuestion.isGrid = true;

  // Check for multi-column option format. A leading option marker ("1.", "a.")
  // is proof this is a stub, so we do NOT defer to looksLikeQuestionText here —
  // that wrongly sent long stubs (with parenthetical examples) into the question text.
  const codeIndex = row.findIndex((c) => isOptionMarker(c));
  if (codeIndex !== -1 && row[codeIndex + 1]) {
    parseOptionMultiColumn(row, codeIndex, currentQuestion);
    return;
  }

  // Otherwise parse as combined format
  parseOptionCombined(row, currentQuestion);
}

/**
 * Parses option in multi-column format
 */
function parseOptionMultiColumn(
  row: string[],
  codeIndex: number,
  currentQuestion: ConvertedQuestion,
): void {
  const optLogic = row[codeIndex + 2] || "";
  let optShow = null,
    optTerm = null;

  if (optLogic.toLowerCase().includes("show") || optLogic.toLowerCase().includes("if "))
    optShow = optLogic;
  if (optLogic.toLowerCase().includes("terminate")) optTerm = optLogic;

  const rawText = row.join(" "); // Search the whole row for flags

  const isExclusive = /EXCLUSIVE/i.test(rawText);
  const isAnchor = /ANCHOR/i.test(rawText);
  const isAlwaysShown = /ALWAYS SHOWN/i.test(rawText);

  const cleanOptText = row[codeIndex + 1]
    .replace(/(EXCLUSIVE|ANCHOR|ALWAYS SHOWN)\.?/gi, "")
    .trim();

  // if (looksLikeQuestionText(cleanOptText)) {
  //   currentQuestion.text += "\n" + row.filter((c) => c !== "").join(" ");
  //   return;
  // }

  currentQuestion.options.push({
    id: row[codeIndex].replace(/[.:]$/, ""),
    text: cleanOptText,
    isExclusive,
    isAnchor,
    isAlwaysShown,
    showLogic: { text: optShow ?? (currentQuestion as any)._grp ?? null, condition: null },
    terminateLogic: { text: optTerm, condition: null },
  });
}

/**
 * Parses option in combined format (option marker + text in single cell)
 */
function parseOptionCombined(
  row: string[],
  currentQuestion: ConvertedQuestion,
): void {
  const firstCell = row.find((c) => c !== "");
  if (!firstCell) return;

  const match = firstCell.match(/^([0-9]+|[a-zA-Z])[.)\]]\s*(.+)$/);
  if (match) {
    const rawText = match[2];
    
    // 1. Detect the flags
    const isExclusive = /EXCLUSIVE/i.test(rawText);
    const isAnchor = /ANCHOR/i.test(rawText);
    const isAlwaysShown = /ALWAYS SHOWN/i.test(rawText);

    // 2. Clean the text
    const cleanOptText = rawText
      .replace(/(EXCLUSIVE|ANCHOR|ALWAYS SHOWN)\.?/gi, "")
      .trim();

    // if (looksLikeQuestionText(cleanOptText)) {
    //   currentQuestion.text += "\n" + row.filter((c) => c !== "").join(" ");
    //   return;
    // }

    // 3. Push the new object
    currentQuestion.options.push({
      id: match[1],
      text: cleanOptText,
      isExclusive,
      isAnchor,
      isAlwaysShown,
      showLogic: { text: (currentQuestion as any)._grp ?? null, condition: null },
      terminateLogic: { text: null, condition: null },
    });
  } else {
    currentQuestion.text += "\n" + row.filter((c) => c !== "").join(" ");
  }
}