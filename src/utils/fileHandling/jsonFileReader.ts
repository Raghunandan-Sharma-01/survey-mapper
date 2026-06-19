/**
 * Handles JSON file parsing and validation
 */

export interface ParsedJsonResult {
  convertedFormat: boolean;
  payload: any;
}

/**
 * Determines if JSON payload is in converted format
 */
export function isConvertedQuestionFormat(parsedData: any): boolean {
  return (
    Array.isArray(parsedData) &&
    parsedData[0]?.showLogic?.text !== undefined
  );
}

/**
 * Parses JSON string and determines its format type
 */
export function parseJsonUpload(jsonString: string): ParsedJsonResult {
  const parsedData = JSON.parse(jsonString);

  if (isConvertedQuestionFormat(parsedData)) {
    return { convertedFormat: true, payload: parsedData };
  }

  return { convertedFormat: false, payload: parsedData };
}

/**
 * Reads a JSON file and returns parsed content
 */
export function readJsonFile(
  file: File,
  onParsed: (result: ParsedJsonResult) => void,
  onError: (message: string) => void,
): void {
  const reader = new FileReader();

  reader.onload = (event) => {
    const result = event.target?.result;
    if (typeof result === "string") {
      try {
        onParsed(parseJsonUpload(result));
      } catch (error) {
        onError("Invalid JSON file. Please upload a valid JSON document.");
      }
    }
  };

  reader.onerror = () => {
    onError("Failed to read the JSON file.");
  };

  reader.readAsText(file);
}