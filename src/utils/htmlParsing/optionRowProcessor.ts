/**
 * Option row processing for question options
 * Handles both single-cell and multi-cell option formats
 */

import { ConvertedQuestion } from "../../types/logic";
import {
  isMetadataRow,
  isOptionMarker,
  looksLikeQuestionText,
  determineQuestionTypeFromText,
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

  // Ignore metadata rows
  if (isMetadataRow(rowText)) return;

  // Determine question type from row and update current question
  const questionType = determineQuestionTypeFromText(rowText);
  if (questionType !== "Multiple Choice") {
    currentQuestion.type = questionType;
  }

  // Check for multi-column option format
  const codeIndex = row.findIndex((c) => isOptionMarker(c));
  if (
    codeIndex !== -1 &&
    row[codeIndex + 1] &&
    !looksLikeQuestionText(row[codeIndex + 1])
  ) {
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

  const cleanOptText = row[codeIndex + 1]
    .replace(/(EXCLUSIVE|ANCHOR)\.?$/i, "")
    .trim();

  if (looksLikeQuestionText(cleanOptText)) {
    currentQuestion.text += "\n" + row.filter((c) => c !== "").join(" ");
    return;
  }

  currentQuestion.options.push({
    id: row[codeIndex].replace(/[.:]$/, ""),
    text: cleanOptText,
    showLogic: { text: optShow, condition: null },
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
    const cleanOptText = match[2]
      .replace(/(EXCLUSIVE|ANCHOR)\.?$/i, "")
      .trim();

    if (looksLikeQuestionText(cleanOptText)) {
      currentQuestion.text += "\n" + row.filter((c) => c !== "").join(" ");
      return;
    }

    currentQuestion.options.push({
      id: match[1],
      text: cleanOptText,
      showLogic: { text: null, condition: null },
      terminateLogic: { text: null, condition: null },
    });
  } else {
    currentQuestion.text += "\n" + row.filter((c) => c !== "").join(" ");
  }
}