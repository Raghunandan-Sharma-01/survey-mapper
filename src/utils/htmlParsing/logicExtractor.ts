/**
 * Logic extraction from HTML paragraphs
 * Identifies and extracts show/terminate logic from text
 */

import { ParsingState, tokenizeText, isQuestionIdPart } from "./htmlElementProcessor";

/**
 * Processes paragraph element and extracts logic statements
 */
export function processParagraphElement(
  el: Element,
  state: ParsingState,
): void {
  let text = el.textContent?.trim() || "";
  if (!text) return;

  // Extract name if present
  const nameMatch = text.match(/\[([^\]]+)\]/);
  if (nameMatch) {
    state.pendingName = nameMatch[1];
    text = text.replace(nameMatch[0], "").trim();
  }

  // Tokenize by lookahead hyphen or lookbehind period
  const parts = tokenizeText(text);

  for (let part of parts) {
    // Break if we hit a Question ID (logic squashing detected)
    if (isQuestionIdPart(part)) {
      break;
    }

    let cleanPart = part.replace(/^-\s*/, "");
    const lower = cleanPart.toLowerCase();

    if (lower.startsWith("show ") || lower.startsWith("if ")) {
      state.pendingShow = (state.pendingShow ? state.pendingShow + " " : "") + cleanPart;
    } else if (lower.startsWith("terminate ") || lower.startsWith("delay ")) {
      state.pendingTerminate =
        (state.pendingTerminate ? state.pendingTerminate + " " : "") + cleanPart;
    }
  }
}

/**
 * Extracts missing options from squashed logic text
 */
export function extractMissingOptionsFromSquashedLogic(
  squashedText: string,
): Array<{ id: string; text: string }> {
  const missingOptions: Array<{ id: string; text: string }> = [];
  const missingOptionRegex = /(\d+)\.([a-zA-Z][^0-9]+?)(?=\d+\.|$)/g;
  let match;

  while ((match = missingOptionRegex.exec(squashedText)) !== null) {
    const optId = match[1];
    let optText = match[2];
    missingOptions.push({ id: optId, text: optText });
  }

  return missingOptions;
}

/**
 * Cleans squashed logic by separating show and terminate logic
 */
export function cleanSquashedLogicText(
  squashedText: string,
  questionId: string,
): { showLogic: string | null; terminateLogic: string | null } {
  let showLogic: string | null = null;
  let terminateLogic: string | null = null;

  if (squashedText.toLowerCase().includes("show")) {
    const showRegex = new RegExp(`(Show.*?)(?=-\\s*Terminate|${questionId}\\.)`, "i");
    const showMatch = squashedText.match(showRegex);
    showLogic = showMatch ? showMatch[1].replace(/^-\s*/, "").trim() : null;
  }

  if (squashedText.toLowerCase().includes("terminate")) {
    const termRegex = new RegExp(`(Terminate.*?)(?=${questionId}\\.|$)`, "i");
    const termMatch = squashedText.match(termRegex);
    if (termMatch) {
      let tText = termMatch[1].replace(/^-\s*/, "").trim();
      if (squashedText.includes(tText + questionId)) tText += " " + questionId;
      terminateLogic = tText;
    }
  }

  return { showLogic, terminateLogic };
}