/**
 * HTML element processing for question parsing
 * Handles paragraph, table, and text extraction
 */

export interface ParsingState {
  pendingName: string;
  pendingShow: string;
  pendingTerminate: string;
}

/**
 * Extracts name from text in brackets [name]
 */
export function extractNameFromText(text: string): string | null {
  const nameMatch = text.match(/\[([^\]]+)\]/);
  return nameMatch ? nameMatch[1] : null;
}

/**
 * Removes name from text by removing bracketed content
 */
export function removeNameFromText(text: string): string {
  return text.replace(/\[[^\]]+\]/, "").trim();
}

/**
 * Tokenizes text by hyphen lookahead and period lookbehind
 */
export function tokenizeText(text: string): string[] {
  return text
    .split(/(?=-\s*)|(?<=\.)/) // Split by lookahead hyphen or lookbehind period
    .map((p) => p.trim())
    .filter((p) => p);
}

/**
 * Checks if text looks like a question row based on content
 */
export function looksLikeQuestionRow(row: string[]): boolean {
  const rowText = row.filter((c) => c !== "").join(" ").trim();
  if (!rowText.includes("?")) return false;

  const textAfterId = row.slice(1).filter((c) => c !== "").join(" ").trim();
  if (!textAfterId) return false;
  if (textAfterId.length < 12) return false;

  const questionWords = /\b(what|which|when|where|why|how|is|are|do|does|did|will|can|could|would|should)\b/i;
  if (questionWords.test(textAfterId)) return true;

  return /\?$/.test(textAfterId) || /^[A-Z][\s\S]+\?$/.test(textAfterId);
}

/**
 * Checks if a cell is a metadata row (instructions, settings)
 */
export function isMetadataRow(rowText: string): boolean {
  return /^(DEFAULT ORDER|RANDOMIZE LIST|COLS:|ROWS:|EXCLUSIVE|ANCHOR)/.test(rowText);
}

/**
 * Checks if cell contains an option marker (number or letter followed by dot/colon)
 */
export function isOptionMarker(cell: string): boolean {
  return /^([0-9]+|[A-Za-z])[.:]$/.test(cell.trim());
}

/**
 * Checks if text looks like a question rather than an option
 */
export function looksLikeQuestionText(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (/\?/.test(trimmed)) return true;

  const questionWords = /\b(what|which|when|where|why|how|is|are|do|does|did|will|can|could|would|should)\b/i;
  return questionWords.test(trimmed) && trimmed.split(/\s+/).length >= 4;
}

/**
 * Checks if part contains question ID (looks like question identifier)
 */
export function isQuestionIdPart(part: string): boolean {
  return /^[A-Z_]+[A-Z0-9_]*\./.test(part);
}

/**
 * Determines question type from row text
 */
export function determineQuestionTypeFromText(rowText: string): string {
  const lowerText = rowText.toLowerCase();
  if (lowerText.includes("select one")) return "Single Choice";
  if (lowerText.includes("select all") || lowerText.includes("select max")) return "Multi Punch";
  if (lowerText.includes("enter your response") || lowerText.includes("numeric")) return "Open Ended";
  return "Multiple Choice";
}