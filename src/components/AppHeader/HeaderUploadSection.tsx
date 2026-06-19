/**
 * Handles the file upload section of the app header
 */

import React from "react";
import {
  buildFileInputLabelClass,
  getUploadButtonLabel,
} from "../../utils/styling/buttonStyleBuilder";

interface HeaderUploadSectionProps {
  isLoading: boolean;
  error: string | null;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const FILE_ACCEPT_TYPES =
  ".json,.docx,application/json,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/**
 * Renders the file upload input and error message
 */
export const HeaderUploadSection: React.FC<HeaderUploadSectionProps> = ({
  isLoading,
  error,
  onFileChange,
}) => {
  return (
    <div className="flex items-center gap-4">
      <label className={buildFileInputLabelClass(isLoading)}>
        {getUploadButtonLabel(isLoading)}
        <input
          type="file"
          accept={FILE_ACCEPT_TYPES}
          onChange={onFileChange}
          className="hidden"
          disabled={isLoading}
        />
      </label>

      {error && (
        <span className="text-red-600 text-xs font-medium">⚠️ {error}</span>
      )}

      <span className="font-semibold text-lg">Survey Logic Designer</span>
    </div>
  );
};