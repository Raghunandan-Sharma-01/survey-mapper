/**
 * Renders individual question items in the questionnaire list
 */

import React from "react";
import { Question } from "../../types/logic";

interface QuestionItemRendererProps {
  question: Question;
  isActive: boolean;
  onSelect: (questionId: string) => void;
}

/**
 * Strips HTML tags from text for clean display
 */
function stripHtmlTags(text: string): string {
  return text.replace(/<[^>]*>/g, "");
}

/**
 * Determines the display text for a question
 */
function getDisplayText(question: Question): string {
  return question.text
    ? stripHtmlTags(question.text)
    : "System Variable / Calculation";
}

/**
 * Builds the CSS class for question item based on active state
 */
function buildQuestionItemClass(isActive: boolean): string {
  return `p-5 mb-3 rounded-xl cursor-pointer transition-all border ${
    isActive
      ? "bg-white shadow-lg border-l-4 border-l-blue-500 border-gray-200"
      : "bg-gray-50 border-gray-200"
  }`;
}

/**
 * Renders a single question item in the list
 */
export const QuestionItemRenderer: React.FC<QuestionItemRendererProps> = ({
  question,
  isActive,
  onSelect,
}) => {
  return (
    <div
      key={question.uniqueKey}
      onClick={() => onSelect(question.id.toString())}
      className={buildQuestionItemClass(isActive)}
    >
      <div className="text-xs text-blue-500 font-bold mb-1">
        {question.fullName}
      </div>

      <div className="font-medium text-slate-800">
        {getDisplayText(question)}
      </div>
    </div>
  );
};