import { ConvertedQuestion } from "../types/logic";
import { parseHtmlToQuestions } from "./parseHtmlToQuestions";
import { cleanAndMergeQuestions } from "./cleanAndMergeQuestions";

export async function convertDocxToQuestions(
  file: File
): Promise<ConvertedQuestion[]> {
  try {
    const mammoth = await import("mammoth");
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });

    if (!result || !result.value) {
      throw new Error("Failed to convert DOCX - no HTML content");
    }

    // 1. Parse the HTML
    const rawQuestions = parseHtmlToQuestions(result.value);
    
    // 2. Clean, Merge, and Rescue
    const processedQuestions = cleanAndMergeQuestions(rawQuestions);    

    return Array.isArray(processedQuestions) ? processedQuestions : [];
  } catch (error) {
    console.error("Conversion error:", error);
    throw error;
  }
}