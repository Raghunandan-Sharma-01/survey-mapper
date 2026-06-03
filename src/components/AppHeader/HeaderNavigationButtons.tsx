/**
 * Handles the navigation buttons in the app header
 */

import React from "react";
import { buildUploadButtonClass } from "../../utils/styling/buttonStyleBuilder";

type ViewType = "editor" | "map";

interface HeaderNavigationButtonsProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
}

/**
 * Renders the view toggle buttons (Editor View and Logic Map)
 */
export const HeaderNavigationButtons: React.FC<
  HeaderNavigationButtonsProps
> = ({ currentView, onViewChange }) => {
  return (
    <div className="flex gap-2">
      <button
        onClick={() => onViewChange("editor")}
        className={buildUploadButtonClass(currentView === "editor")}
      >
        Editor View
      </button>
      <button
        onClick={() => onViewChange("map")}
        className={buildUploadButtonClass(currentView === "map")}
      >
        Logic Map
      </button>
    </div>
  );
};