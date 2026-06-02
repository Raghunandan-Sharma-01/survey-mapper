import React, { useState } from "react";
import { useSurveyStore } from "./store/useSurveyStore";
import LogicMap from "./components/LogicMap";
import ConvertedQuestionsView from "./components/ConvertedQuestionsView";
import { convertDocxToQuestions } from "./utils/docConverter";

const isDocxFile = (file: File) =>
  file.type ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
  file.name.toLowerCase().endsWith(".docx");

const getUploadButtonClass = (active: boolean) =>
  `px-5 py-2 rounded-full font-medium transition cursor-pointer ${
    active
      ? "bg-blue-500 text-white border-none"
      : "bg-transparent text-gray-600 border border-gray-300"
  }`;

const parseJsonUpload = (jsonString: string) => {
  const parsedData = JSON.parse(jsonString);

  if (Array.isArray(parsedData) && parsedData[0]?.showLogic?.text !== undefined) {
    return { convertedFormat: true, payload: parsedData };
  }

  return { convertedFormat: false, payload: parsedData };
};

const readJsonFile = (
  file: File,
  onParsed: (result: { convertedFormat: boolean; payload: any }) => void,
  onError: (message: string) => void,
) => {
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
};

export default function App() {
  const {
    currentView,
    setView,
    setSurveyData,
    setConvertedQuestions,
    refinedQuestions,
    convertedQuestions,
  } = useSurveyStore();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJsonFileUpload = (file: File) => {
    readJsonFile(
      file,
      ({ convertedFormat, payload }) => {
        if (convertedFormat) {
          setConvertedQuestions(payload);
        } else {
          setSurveyData(payload);
        }
      },
      setError,
    );
  };

  const handleDocxFileUpload = async (file: File) => {
    const questions = await convertDocxToQuestions(file);
    if (questions.length === 0) {
      setError("No questions found in the document. Please check the document format.");
      return;
    }
    setConvertedQuestions(questions);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setIsLoading(true);
    setError(null);

    try {
      if (isDocxFile(file)) {
        await handleDocxFileUpload(file);
      } else {
        handleJsonFileUpload(file);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to upload file";
      setError(errorMessage);
      console.error("Upload error:", err);
    } finally {
      setIsLoading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="w-screen h-screen flex flex-col bg-gray-100 font-sans">
      <header className="px-6 h-15 bg-white text-gray-900 flex justify-between items-center shadow-md z-10">
        <div className="flex items-center gap-4">
          <label
            className={`${
              isLoading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-500 cursor-pointer hover:bg-blue-600"
            } text-white px-4 py-2 rounded text-sm transition`}
          >
            {isLoading ? "Converting..." : "Upload (JSON/DOCX)"}
            <input
              type="file"
              accept=".json,.docx,application/json,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleFileUpload}
              className="hidden"
              disabled={isLoading}
            />
          </label>

          {error && (
            <span className="text-red-600 text-xs font-medium">⚠️ {error}</span>
          )}

          <span className="font-semibold text-lg">Survey Logic Designer</span>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setView("editor")}
            className={getUploadButtonClass(currentView === "editor")}
          >
            Editor View
          </button>
          <button
            onClick={() => setView("map")}
            className={getUploadButtonClass(currentView === "map")}
          >
            Logic Map
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {currentView === "editor" ? (
          <div className="flex w-full">
            {convertedQuestions.length > 0 ? (
              <ConvertedQuestionsView questions={convertedQuestions} />
            ) : (
              <div className="flex-1 overflow-y-auto p-8">
                <div className="max-w-200 mx-auto">
                  <h2 className="mb-5 text-gray-800 text-xl font-semibold">
                    Questionnaire Structure
                  </h2>

                  {refinedQuestions.map((q) => {
                    const isActive = selectedId === q.id.toString();

                    return (
                      <div
                        key={q.uniqueKey}
                        onClick={() => setSelectedId(q.id.toString())}
                        className={`p-5 mb-3 rounded-xl cursor-pointer transition-all border ${
                          isActive
                            ? "bg-white shadow-lg border-l-4 border-l-blue-500 border-gray-200"
                            : "bg-gray-50 border-gray-200"
                        }`}
                      >
                        <div className="text-xs text-blue-500 font-bold mb-1">
                          {q.fullName}
                        </div>

                        <div className="font-medium text-slate-800">
                          {q.text
                            ? q.text.replace(/<[^>]*>/g, "")
                            : "System Variable / Calculation"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
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
