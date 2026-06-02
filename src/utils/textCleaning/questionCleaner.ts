/**
 * Question cleaning utilities
 * Handles merging duplicates, cleaning squashed logic, and removing metadata
 */

import { ConvertedQuestion } from "../../types/logic";
import { stripInstructionsFromText, getInstructionsToStrip } from "./instructionStripper";
import { cleanSquashedLogicText, extractMissingOptionsFromSquashedLogic } from "../htmlParsing/logicExtractor";

/**
 * Merges questions with duplicate IDs
 */
export function mergeDuplicateQuestions(
  rawQuestions: ConvertedQuestion[],
): ConvertedQuestion[] {
  const mergedMap = new Map<string, ConvertedQuestion>();

  for (const q of rawQuestions) {
    if (!mergedMap.has(q.id)) {
      mergedMap.set(q.id, { ...q, options: [...q.options] });
    } else {
      const existing = mergedMap.get(q.id)!;
      if (existing.name === existing.id && q.name !== q.id) {
        existing.name = q.name;
      }
      if (q.options.length > 0) {
        existing.options = [...existing.options, ...q.options];
      }
      if (!existing.showLogic.text && q.showLogic.text)
        existing.showLogic.text = q.showLogic.text;
      if (!existing.terminateLogic.text && q.terminateLogic.text)
        existing.terminateLogic.text = q.terminateLogic.text;
    }
  }

  return Array.from(mergedMap.values());
}

/**
 * Cleans squashed logic text that contains both show and terminate logic
 */
export function cleanSquashedLogic(q: ConvertedQuestion): void {
  const squashedText = q.showLogic.text || q.terminateLogic.text || "";

  if (squashedText.length > 50 && squashedText.includes(q.id)) {
    const { showLogic, terminateLogic } = cleanSquashedLogicText(
      squashedText,
      q.id,
    );
    q.showLogic.text = showLogic;
    q.terminateLogic.text = terminateLogic;

    // Rescue options missing from the table due to squashing
    const missingOptions = extractMissingOptionsFromSquashedLogic(squashedText);
    missingOptions.forEach(({ id, text }) => {
      if (!q.options.some((o) => o.id === id)) {
        q.options.push({
          id,
          text,
          showLogic: { text: null, condition: null },
          terminateLogic: { text: null, condition: null },
        });
      }
    });
  }
}

/**
 * Strips instructions from question text
 */
export function stripInstructionsFromQuestionText(
  q: ConvertedQuestion,
  instructionsToStrip: RegExp[],
): void {
  q.text = stripInstructionsFromText(q.text, instructionsToStrip);
}

/**
 * Strips instructions from all question options
 */
export function stripInstructionsFromQuestionOptions(
  q: ConvertedQuestion,
  instructionsToStrip: RegExp[],
): void {
  for (let i = 0; i < q.options.length; i++) {
    q.options[i].text = stripInstructionsFromText(
      q.options[i].text,
      instructionsToStrip,
    );
  }
}

/**
 * Removes blank and duplicate options
 */
export function removeBlankAndDuplicateOptions(q: ConvertedQuestion): void {
  q.options = q.options.filter(
    (opt, index, self) =>
      opt.text !== "" && index === self.findIndex((t) => t.id === opt.id),
  );
}