/**
 * Main cleaner and merger for questions
 * Orchestrates all cleaning operations: deduplication, logic cleanup, instruction removal
 */

import { ConvertedQuestion } from "../types/logic";
import {
  mergeDuplicateQuestions,
  cleanSquashedLogic,
  stripInstructionsFromQuestionText,
  stripInstructionsFromQuestionOptions,
  removeBlankAndDuplicateOptions,
} from "./textCleaning/questionCleaner";
import { getInstructionsToStrip } from "./textCleaning/instructionStripper";

/**
 * Main entry point: cleans and merges questions
 * Performs all cleanup operations in sequence
 */
export function cleanAndMergeQuestions(
  rawQuestions: ConvertedQuestion[],
): ConvertedQuestion[] {
  const mergedQuestions = mergeDuplicateQuestions(rawQuestions);
  const instructionsToStrip = getInstructionsToStrip();

  for (const q of mergedQuestions) {
    cleanSquashedLogic(q);
    stripInstructionsFromQuestionText(q, instructionsToStrip);
    stripInstructionsFromQuestionOptions(q, instructionsToStrip);
    removeBlankAndDuplicateOptions(q);
  }

  return mergedQuestions;
}