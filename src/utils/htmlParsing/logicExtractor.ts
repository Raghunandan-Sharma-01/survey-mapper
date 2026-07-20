/**
 * Logic extraction from HTML paragraphs
 * Identifies and extracts show/terminate logic from text
 */

import { ParsingState, tokenizeText, isQuestionIdPart } from "./htmlElementProcessor";
import { isMaskingLogic } from "../logicHelpers";

const appendLine = (existing: string, line: string) =>
  existing ? existing + "\n" + line : line;

export function processParagraphElement(el: Element, state: ParsingState): void {
  let text = el.textContent?.trim() || "";
  if (!text) return;

  // FIX: only a LEADING [Name] (e.g. "[Gender]"), never an inline code like "[1]".
  const nameMatch = text.match(/^\s*\[([^\]]+)\]/);
  if (nameMatch) {
    state.pendingName = nameMatch[1];
    state.pendingShow = "";
    state.pendingTerminate = "";
    text = text.replace(nameMatch[0], "").trim();
  }

  const parts = tokenizeText(text);
  for (const part of parts) {
    if (isQuestionIdPart(part)) break;
    const cleanPart = part.replace(/^-\s*/, "").trim();
    if (!cleanPart) continue;
    const lower = cleanPart.toLowerCase();

    if (/^(show|if)\b/i.test(lower)) {
      if (isMaskingLogic(cleanPart)) continue; // skip stub caps / masking
      state.pendingShow = appendLine(state.pendingShow, cleanPart);
    } else if (/^(terminate|delay)\b/i.test(lower)) {
      state.pendingTerminate = appendLine(state.pendingTerminate, cleanPart);
    }
    // masking / "only show" / "hide" / qcflag lines are intentionally dropped.
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
    const showRegex = new RegExp(`(Show.*?)(?=-\\s*Terminate|${questionId}\\.|$)`, "i");
    const showMatch = squashedText.match(showRegex);
    if (showMatch) {
      let sText = showMatch[1].replace(/^-\s*/, "").trim();
      
      // FIX: Check if the ID was chopped off by using a whitespace-friendly regex
      const regexCheck = new RegExp(sText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s+' + questionId, 'i');
      if (regexCheck.test(squashedText)) sText += " " + questionId;
      
      showLogic = sText;
    }
  }

  if (squashedText.toLowerCase().includes("terminate")) {
    const termRegex = new RegExp(`(Terminate.*?)(?=${questionId}\\.|$)`, "i");
    const termMatch = squashedText.match(termRegex);
    if (termMatch) {
      let tText = termMatch[1].replace(/^-\s*/, "").trim();
      
      // FIX: tText was trimmed, dropping the space. Use Regex to safely re-attach.
      const regexCheck = new RegExp(tText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s+' + questionId, 'i');
      if (regexCheck.test(squashedText)) tText += " " + questionId;
      
      terminateLogic = tText;
    }
  }

  return { showLogic, terminateLogic };
}