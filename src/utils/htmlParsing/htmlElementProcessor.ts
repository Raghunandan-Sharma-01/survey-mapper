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
    .split(/(?<=\.)|(?=\s-\s)/) // Split by lookahead hyphen or lookbehind period
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
  return /^(DEFAULT ORDER|RANDOMIZE|COLS:|ROWS:|EXCLUSIVE|ANCHOR|ALWAYS SHOWN)/.test(rowText);
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

  // 1. Definite question markers
  if (/\?/.test(trimmed)) return true;

  // 2. Starts with a question word (Removed the >= 4 words limit to catch short questions)
  const questionWords = /^(what|which|when|where|why|how|is|are|do|does|did|will|can|could|would|should|please)\b/i;
  if (questionWords.test(trimmed)) return true;

  // 3. Catch instructional text that often accompanies questions
  const instructionalWords = /^(select|enter|choose|click|type|provide|rank|rate|evaluate|specify)\b/i;
  if (instructionalWords.test(trimmed)) return true;

  // 4. Catch short noun phrases typically used as demographic headers
  const demographicHeaders = /^(gender|age|zip code|email|name|profession|income|challenges|assigner)$/i;
  if (demographicHeaders.test(trimmed)) return true;

  // 5. Broad sentence check (Options are usually short; descriptions/rules are long)
  if (trimmed.split(/\s+/).length >= 8) return true;

  return false;
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
  const t = rowText.toLowerCase();
  if (/\bnumeric\b|integer|enter (a )?number|whole number/.test(t)) return "Numeric";
  if (t.includes("select one")) return "Single Choice";
  if (t.includes("select all") || t.includes("select max") || t.includes("select up to")) return "Multi Punch";
  if (t.includes("enter your response") || t.includes("open")) return "Open Ended";
  return "Multiple Choice";
}

/** A grid instruction implies rows x columns ("... for each", "... in each row"). */
export function isGridInstruction(rowText: string): boolean {
  return /\bfor each\b|\bin each\b|each row|each column/i.test(rowText);
}