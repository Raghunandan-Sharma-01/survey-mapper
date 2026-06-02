import { ConvertedQuestion } from "../types/logic";

export function parseHtmlToQuestions(html: string): ConvertedQuestion[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const questions: ConvertedQuestion[] = [];

  let currentQuestion: ConvertedQuestion | null = null;
  let pendingName = "";
  let pendingShow = "";
  let pendingTerminate = "";

  const elements = Array.from(doc.body.children);

  for (const el of elements) {
    const tagName = el.tagName.toLowerCase();

    if (tagName === "p" || tagName.match(/^h[1-6]$/)) {
      processParagraphElement(el, { pendingName, pendingShow, pendingTerminate });
    } else if (tagName === "table") {
      currentQuestion = processTableElement(el, questions, currentQuestion, { pendingName, pendingShow, pendingTerminate });
    }
  }

  if (currentQuestion) {
    questions.push(currentQuestion);
  }

  return questions;
}

function processParagraphElement(
  el: Element,
  state: { pendingName: string; pendingShow: string; pendingTerminate: string }
) {
  let text = el.textContent?.trim() || "";
  if (!text) return;

  // Extract Name
  const nameMatch = text.match(/\[([^\]]+)\]/);
  if (nameMatch) {
    state.pendingName = nameMatch[1];
    text = text.replace(nameMatch[0], "").trim();
  }

  // Tokenize by lookahead hyphen or lookbehind period to split squashed text safely
  const parts = text.split(/(?=-\s*)|(?<=\.)/).map(p => p.trim()).filter(p => p);

  for (let part of parts) {
    // BREAK OUT: If we hit a Question ID, Mammoth squashed the table into this paragraph.
    // Stop grabbing logic so we don't swallow the actual question text.
    if (part.match(/^[A-Z_]+[A-Z0-9_]*\./)) {
      break;
    }

    let cleanPart = part.replace(/^-\s*/, "");
    const lower = cleanPart.toLowerCase();

    if (lower.startsWith("show ") || lower.startsWith("if ")) {
      state.pendingShow = (state.pendingShow ? state.pendingShow + " " : "") + cleanPart;
    } else if (lower.startsWith("terminate ") || lower.startsWith("delay ")) {
      state.pendingTerminate = (state.pendingTerminate ? state.pendingTerminate + " " : "") + cleanPart;
    }
  }
}

function processTableElement(
  el: Element,
  questions: ConvertedQuestion[],
  currentQuestion: ConvertedQuestion | null,
  state: { pendingName: string; pendingShow: string; pendingTerminate: string }
): ConvertedQuestion | null {
  const rows = Array.from(el.querySelectorAll("tr"));
  const cells2D = rows.map((row) =>
    Array.from(row.querySelectorAll("td, th")).map(
      (c) => c.textContent?.trim() || ""
    )
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

function detectQuestionIdIndex(row: string[]): number {
  const explicitIdIndex = row.findIndex(
    (c) => c.match(/^[A-Za-z_]+[A-Za-z0-9_]*\.$/) && !c.match(/^\d+\.$/)
  );
  if (explicitIdIndex !== -1) return explicitIdIndex;

  const numericIndex = row.findIndex((c) => c.match(/^\d+\.$/));
  if (numericIndex !== -1 && looksLikeQuestionRow(row)) {
    return numericIndex;
  }

  return -1;
}

function looksLikeQuestionRow(row: string[]): boolean {
  const rowText = row.filter((c) => c !== "").join(" ").trim();
  if (!rowText.includes("?")) return false;

  const textAfterId = row.slice(1).filter((c) => c !== "").join(" ").trim();
  if (!textAfterId) return false;
  if (textAfterId.length < 12) return false;

  const questionWords = /\b(what|which|when|where|why|how|is|are|do|does|did|will|can|could|would|should)\b/i;
  if (questionWords.test(textAfterId)) return true;

  // Fallback: if the text ends in a question mark or looks like a full sentence,
  // treat it as a question even if it doesn't start with a common keyword.
  return /\?$/.test(textAfterId) || /^[A-Z][\s\S]+\?$/.test(textAfterId);
}

function createNewQuestion(
  row: string[],
  idIndex: number,
  state: { pendingName: string; pendingShow: string; pendingTerminate: string }
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

function processOptionRow(row: string[], currentQuestion: ConvertedQuestion) {
  const rowText = row.filter((c) => c !== "").join(" ");
  if (!rowText) return;

  // Ignore metadata rows
  if (isMetadataRow(rowText)) return;

  determineQuestionType(rowText, currentQuestion);

  const codeIndex = row.findIndex((c) => isOptionMarker(c));
  if (codeIndex !== -1 && row[codeIndex + 1] && !looksLikeQuestionText(row[codeIndex + 1])) {
    parseOptionMultiColumn(row, codeIndex, currentQuestion);
    return;
  }

  parseOptionCombined(row, currentQuestion);
}

function isMetadataRow(rowText: string) {
  return /^(DEFAULT ORDER|RANDOMIZE LIST|COLS:|ROWS:|EXCLUSIVE|ANCHOR)/.test(rowText);
}

function isOptionMarker(cell: string) {
  return /^([0-9]+|[A-Za-z])[.:]$/.test(cell.trim());
}

function looksLikeQuestionText(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (/\?/.test(trimmed)) return true;

  const questionWords = /\b(what|which|when|where|why|how|is|are|do|does|did|will|can|could|would|should)\b/i;
  return questionWords.test(trimmed) && trimmed.split(/\s+/).length >= 4;
}

function determineQuestionType(rowText: string, currentQuestion: ConvertedQuestion) {
  const lowerText = rowText.toLowerCase();
  if (lowerText.includes("select one")) currentQuestion.type = "Single Choice";
  else if (lowerText.includes("select all") || lowerText.includes("select max")) currentQuestion.type = "Multi Punch";
  else if (lowerText.includes("enter your response") || lowerText.includes("numeric")) currentQuestion.type = "Open Ended";
}

function parseOptionMultiColumn(row: string[], codeIndex: number, currentQuestion: ConvertedQuestion) {
  const optLogic = row[codeIndex + 2] || "";
  let optShow = null, optTerm = null;

  if (optLogic.toLowerCase().includes("show") || optLogic.toLowerCase().includes("if ")) optShow = optLogic;
  if (optLogic.toLowerCase().includes("terminate")) optTerm = optLogic;

  // Clean trailing metadata from option text
  let cleanOptText = row[codeIndex + 1].replace(/(EXCLUSIVE|ANCHOR)\.?$/i, "").trim();
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

function parseOptionCombined(row: string[], currentQuestion: ConvertedQuestion) {
  const firstCell = row.find((c) => c !== "");
  if (!firstCell) return;

  const match = firstCell.match(/^([0-9]+|[a-zA-Z])[.)]\s*(.+)$/);
  if (match) {
    const cleanOptText = match[2].replace(/(EXCLUSIVE|ANCHOR)\.?$/i, "").trim();
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