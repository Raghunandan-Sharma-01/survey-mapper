/**
 * Manages file upload logic and delegates to appropriate handlers
 */

import { isDocxFile } from "./fileTypeDetector";
import { convertDocxToQuestions } from "../docConverter";

export interface UploadHandlerCallbacks {
  onDocxConverted: (questions: any[]) => void;
  onError: (message: string) => void;
  onLoadingChange: (isLoading: boolean) => void;
}

/**
 * Validates the uploaded file and processes it accordingly
 */
export async function handleFileUpload(
  file: File,
  callbacks: UploadHandlerCallbacks,
): Promise<void> {
  callbacks.onLoadingChange(true);
  callbacks.onError("");

  try {
    if (isDocxFile(file)) {
      await handleDocxFileUpload(file, callbacks);
    } else {
      callbacks.onError(
        "Unsupported file type. Please upload a .docx file.",
      );
    }
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Failed to upload file";
    callbacks.onError(errorMessage);
    console.error("Upload error:", err);
  } finally {
    callbacks.onLoadingChange(false);
  }
}

/**
 * Processes DOCX file upload and converts to questions
 */
async function handleDocxFileUpload(
  file: File,
  callbacks: UploadHandlerCallbacks,
): Promise<void> {
  const questions = await convertDocxToQuestions(file);

  if (questions.length === 0) {
    callbacks.onError(
      "No questions found in the document. Please check the document format.",
    );
    return;
  }

  callbacks.onDocxConverted(questions);
}