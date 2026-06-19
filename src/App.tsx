import React, { useState } from "react";
import { useSurveyStore } from "./store/useSurveyStore";
import LogicMap from "./components/LogicMap";
import ConvertedQuestionsView from "./components/ConvertedQuestionsView";
import { QuestionnaireSidebar } from "./components/QuestionnaireStructure/QuestionnaireSidebar";
import { HeaderUploadSection } from "./components/AppHeader/HeaderUploadSection";
import { HeaderNavigationButtons } from "./components/AppHeader/HeaderNavigationButtons";
import {
  handleFileUpload,
  UploadHandlerCallbacks,
} from "./utils/fileHandling/uploadHandler";

export default function App() {
  const {
    currentView,
    setView,
    setSurveyData,
    setConvertedQuestions,
    refinedQuestions,
    convertedQuestions,
  } = useSurveyStore();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Handles file input change event and processes the file
   */
  const handleFileInputChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    const uploadCallbacks: UploadHandlerCallbacks = {
      onJsonParsed: ({ convertedFormat, payload }) => {
        if (convertedFormat) {
          setConvertedQuestions(payload);
        } else {
          setSurveyData(payload);
        }
      },
      onDocxConverted: (questions) => setConvertedQuestions(questions),
      onError: setError,
      onLoadingChange: setIsLoading,
    };

    await handleFileUpload(file, uploadCallbacks);
    e.target.value = "";
  };

  const shouldShowConvertedQuestionsView = convertedQuestions.length > 0;

  return (
    <div className="w-screen h-screen flex flex-col bg-gray-100 font-sans">
      <header className="px-6 h-15 bg-white text-gray-900 flex justify-between items-center shadow-md z-10">
        <HeaderUploadSection
          isLoading={isLoading}
          error={error}
          onFileChange={handleFileInputChange}
        />

        <HeaderNavigationButtons currentView={currentView} onViewChange={setView} />
      </header>

      <main className="flex-1 flex overflow-hidden">
        {currentView === "editor" ? (
          <div className="flex w-full">
            {shouldShowConvertedQuestionsView ? (
              <ConvertedQuestionsView questions={convertedQuestions} />
            ) : (
              <QuestionnaireSidebar questions={refinedQuestions} />
            )}
          </div>
        ) : (
          <div className="flex-1 relative">
            <LogicMap />
          </div>
        )}
      </main>
    </div>
  );
}