/**
 * Constructs Tailwind CSS classes for buttons based on state
 */

/**
 * Builds className for upload/navigation buttons
 */
export function buildUploadButtonClass(isActive: boolean): string {
  return `px-5 py-2 rounded-full font-medium transition cursor-pointer ${
    isActive
      ? "bg-blue-500 text-white border-none"
      : "bg-transparent text-gray-600 border border-gray-300"
  }`;
}

/**
 * Builds className for upload input button based on loading state
 */
export function buildFileInputLabelClass(isLoading: boolean): string {
  return `${
    isLoading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-500 cursor-pointer hover:bg-blue-600"
  } text-white px-4 py-2 rounded text-sm transition`;
}

/**
 * Gets the label text for upload button
 */
export function getUploadButtonLabel(isLoading: boolean): string {
  return isLoading ? "Converting..." : "Upload (JSON/DOCX)";
}