/**
 * Displays the questionnaire structure as a sidebar list
 */

import React, { useState } from "react";
import { Question } from "../../types/logic";
import { QuestionItemRenderer } from "./QuestionItemRenderer";

interface QuestionnaireSidebarProps {
  questions: Question[];
}

/**
 * Main component for displaying questionnaire structure
 */
export const QuestionnaireSidebar: React.FC<QuestionnaireSidebarProps> = ({
  questions,
}) => {
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(
    null,
  );

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-200 mx-auto">
        <h2 className="mb-5 text-gray-800 text-xl font-semibold">
          Questionnaire Structure
        </h2>

        {questions.map((question) => (
          <QuestionItemRenderer
            key={question.id}
            question={question}
            isActive={selectedQuestionId === question.id.toString()}
            onSelect={setSelectedQuestionId}
          />
        ))}
      </div>
    </div>
  );
};