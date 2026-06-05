import { LogicNode, ComparisonOperator } from "../../types/logic";

/**
 * Translates English raw text into a machine-readable Abstract Syntax Tree (AST)
 */
export function parseTextToLogicNode(text: string | null): LogicNode | null {
  if (!text) return null;
  if (/show to all/i.test(text)) return null;

  // THE FIX: Catch Masking Logic (Stub/Row filters) and abort structural routing
  if (/only show/i.test(text) || /(rows|columns|stubs).*selected/i.test(text)) {
    // In the future, you can return a specific type: "masking" here.
    // For the visual routing graph, we return null so it stays on the main spine.
    return null; 
  }

  const selectionRegex = /(not\s+)?selected\s+code\s+\[(.*?)\]\s+(?:at|in|from)\s+([a-zA-Z0-9_]+)/i;
  const match = text.match(selectionRegex);

  if (match) {
    return {
      type: "leaf",
      questionId: match[3].trim(),
      questionFullName: match[3].trim(),
      operator: match[1] ? ComparisonOperator.NOT_SELECTED : ComparisonOperator.SELECTED,
      path: null,
      value: match[2].trim(),
    };
  }
  
  return null;
}