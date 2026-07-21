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

  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    const tagName = el.tagName.toLowerCase();

    // 1. Check if it is a structural marker
    const text = el.textContent?.trim() || "";
    const isStructuralMarker = /^(loop\s*start|loop\s*end|subsection\s*start|subsection\s*end|section\s*start|section\s*end)\b/i.test(text);
    
    // 2. IMPORTANT: Ignore the Table of Contents! (TOC items have href links to anchors)
    const isTOC = el.querySelector("a[href^='#']");
    if (
      (tagName === "p" || tagName.match(/^h[1-6]$/)) &&
      !isTOC &&
      /^(qc\s*flags|appendix\b|logic\s*rule\s*descriptions)\b/i.test(text)
    ) {
      if (currentQuestion) { questions.push(currentQuestion); currentQuestion = null; }
      break;
    }

    if ((tagName === "p" || tagName.match(/^h[1-6]$/)) && isStructuralMarker && !isTOC) {
      // Push any open table question first
      if (currentQuestion) {
        questions.push(currentQuestion);
        currentQuestion = null;
      }

      // INJECT THE STRUCTURAL MARKER INTO THE DATA STREAM!
      questions.push({
        id: `MARKER_${i}`, // Unique ID so the merger ignores it
        name: text,
        type: "Structural Marker",
        text: text,
        parentBlocks: [],
        showLogic: { text: null, condition: null },
        terminateLogic: { text: null, condition: null },
        options: []
      } as unknown as ConvertedQuestion);

      // Reset pending state so this text doesn't accidentally bleed into the next question
      parsingState.pendingName = "";
      parsingState.pendingShow = "";
      parsingState.pendingTerminate = "";

    } else if (tagName === "p" || tagName.match(/^h[1-6]$/)) {
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

// Collects [Name]/Show/Terminate <p> paragraphs from a question's wrapper cell
// (a <td>/<th> that itself contains a nested <table>).
function collectWrapperLogicParagraphs(el: Element): Element[] {
  const paras: Element[] = [];
  for (const cell of Array.from(el.querySelectorAll("td, th"))) {
    if (!cell.querySelector("table")) continue; // only wrapper cells carry logic
    for (const child of Array.from(cell.children)) {
      if (child.tagName.toLowerCase() === "p") paras.push(child);
    }
  }
  return paras;
}

function processTableElement(
  el: Element,
  questions: ConvertedQuestion[],
  currentQuestion: ConvertedQuestion | null,
  state: ParsingState,
): ConvertedQuestion | null {
  // 1. Harvest [Name]/Show/Terminate paragraphs into parsing state.
  for (const p of collectWrapperLogicParagraphs(el)) processParagraphElement(p, state);

  // 2. FIX: only iterate LEAF rows (no nested table) so we never re-read the
  //    whole question box as one blob row (that caused duplicates + pollution).
  const rows = Array.from(el.querySelectorAll("tr")).filter((tr) => !tr.querySelector("table"));
  const cells2D = rows.map((row) =>
    Array.from(row.querySelectorAll("td, th")).map((c) => c.textContent?.trim() || ""),
  );

  for (let r = 0; r < cells2D.length; r++) {
    const row = cells2D[r];
    if (row.every((c) => c === "")) continue;
    const idIndex = detectQuestionIdIndex(row);
    if (idIndex !== -1) {
      if (currentQuestion) questions.push(currentQuestion);
      currentQuestion = createNewQuestion(row, idIndex, state);
      state.pendingName = ""; state.pendingShow = ""; state.pendingTerminate = "";
    } else if (currentQuestion) {
      processOptionRow(row, currentQuestion);
    }
  }
  return currentQuestion;
}