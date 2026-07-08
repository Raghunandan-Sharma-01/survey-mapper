/**
 * Detects file type and validates file formats for upload
 */

const DOCX_MIME_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const DOCX_EXTENSION = ".docx";

export function isDocxFile(file: File): boolean {
  return (
    file.type === DOCX_MIME_TYPE ||
    file.name.toLowerCase().endsWith(DOCX_EXTENSION)
  );
}
