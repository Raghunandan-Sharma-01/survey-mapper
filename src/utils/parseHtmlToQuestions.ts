/**
 * Main parser for converting HTML to structured questions
 * Handles both paragraph and table-based HTML formats
 */

import { ConvertedQuestion } from "../types/logic";
import { ParsingState } from "./htmlParsing/htmlElementProcessor";
import { processParagraphElement } from "./htmlParsing/logicExtractor";
import {
  detectQuestionIdIndex,
  createNewQuestion,
} from "./htmlParsing/questionExtractor";
import { processOptionRow } from "./htmlParsing/optionRowProcessor";

/**
 * Main entry point: converts HTML document to array of questions
 */
export function parseHtmlToQuestions(html: string): ConvertedQuestion[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const questions: ConvertedQuestion[] = [];

  let currentQuestion: ConvertedQuestion | null = null;
  const parsingState: ParsingState = {
    pendingName: "",
    pendingShow: "",
    pendingTerminate: "",
  };

  const elements = Array.from(doc.body.children);

  for (const el of elements) {
    const tagName = el.tagName.toLowerCase();

    if (tagName === "p" || tagName.match(/^h[1-6]$/)) {
      processParagraphElement(el, parsingState);
    } else if (tagName === "table") {
      currentQuestion = processTableElement(
        el,
        questions,
        currentQuestion,
        parsingState,
      );
    }
  }

  if (currentQuestion) {
    questions.push(currentQuestion);
  }

  return questions;
}

/**
 * Processes table element containing questions and options
 */
function processTableElement(
  el: Element,
  questions: ConvertedQuestion[],
  currentQuestion: ConvertedQuestion | null,
  state: ParsingState,
): ConvertedQuestion | null {
  const rows = Array.from(el.querySelectorAll("tr"));
  const cells2D = rows.map((row) =>
    Array.from(row.querySelectorAll("td, th")).map(
      (c) => c.textContent?.trim() || "",
    ),
  );

  for (let r = 0; r < cells2D.length; r++) {
    const row = cells2D[r];
    if (row.every((c) => c === "")) continue;

    const idIndex = detectQuestionIdIndex(row);

    if (idIndex !== -1) {
      if (currentQuestion) {
        questions.push(currentQuestion);
      }
      currentQuestion = createNewQuestion(row, idIndex, state);
      state.pendingName = "";
      state.pendingShow = "";
      state.pendingTerminate = "";
    } else if (currentQuestion) {
      processOptionRow(row, currentQuestion);
    }
  }

  return currentQuestion;
}