/**
 * Instruction and metadata stripper
 * Removes instruction text and metadata from questions and options
 */

/**
 * Gets all instruction patterns to strip from questions
 */
export function getInstructionsToStrip(): RegExp[] {
  return [
    /Select one response\.?/gi,
    /Select all that apply for each\.?/gi,
    /Select all that apply\.?/gi,
    /Select max \d+ options\.?/gi,
    /Select any \d+ options or less\.?/gi,
    /Enter your response in the box\.?/gi,
    /Enter a numeric response\.?/gi,
    /DEFAULT ORDER\.?/gi,
    /RANDOMIZE LIST\.?/gi,
    /COLS:[^\n]*/gi,
    /ROWS:[^\n]*/gi,
    /MIN:\s*\d*\.?/gi,
    /MAX:\s*\d*\.?/gi,
    /INTEGER NUMERIC RESPONSES\.?/gi,
    /EXCLUSIVE\.?/gi,
    /ANCHOR\.?/gi,
    /ALWAYS SHOWN\.?/gi,
  ];
}

/**
 * Strips all instruction patterns from text
 */
export function stripInstructionsFromText(
  text: string,
  instructionsToStrip: RegExp[],
): string {
  let cleanedText = text;
  instructionsToStrip.forEach((regex) => {
    cleanedText = cleanedText.replace(regex, "");
  });
  return cleanedText.trim();
}