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

// 1. Import the new QA Rules Viewer
import QARulesViewer from "./components/Checklist/QARulesViewer"; 

export default function App() {
  const {
    currentView,
    setView,
    setConvertedQuestions,
    refinedQuestions,
    convertedQuestions,
  } = useSurveyStore();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 2. Add a local state to handle toggling the QA View independently of the main graph/editor views
  const [showQARules, setShowQARules] = useState(false);

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
      <header className="px-6 py-3 h-16 bg-white text-gray-900 flex justify-between items-center shadow-md z-10">
        <HeaderUploadSection
          isLoading={isLoading}
          error={error}
          onFileChange={handleFileInputChange}
        />

        {/* 3. Group the navigation buttons together */}
        <div className="flex items-center gap-4">
          
          {/* QA Rules Toggle Button */}
          <button
            onClick={() => setShowQARules(!showQARules)}
            className={`px-4 py-2 font-bold text-sm rounded-md transition-colors ${
              showQARules 
                ? "bg-blue-100 text-blue-700 shadow-inner" 
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {showQARules ? "Close QA Rules" : "View QA Rules"}
          </button>
          
          <HeaderNavigationButtons currentView={currentView} onViewChange={setView} />
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* 4. Conditionally render QA Rules, or fall back to your normal views */}
        {showQARules ? (
          <div className="w-full h-full overflow-hidden bg-slate-50">
            <QARulesViewer />
          </div>
        ) : currentView === "editor" ? (
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