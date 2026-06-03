import React from "react";
import { ConvertedQuestion } from "../../types/logic";

interface ConvertedQuestionsViewProps {
  questions: ConvertedQuestion[];
}

export default function ConvertedQuestionsView({
  questions,
}: ConvertedQuestionsViewProps) {
  if (questions.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-gray-500 text-lg">No converted questions to display</p>
      </div>
    );
  }
  

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h2 className="mb-5 text-gray-800 text-2xl font-bold">
          Survey Questions - Converted View
        </h2>

        {questions.map((q) => (
          <div
            key={q.id}
            className="bg-white rounded-lg shadow-md p-6 border-l-4 border-l-blue-500"
          >
            {/* Question Header */}
            <div className="mb-4">
              <div className="flex items-baseline gap-3 mb-2">
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded">
                  {q.id}
                </span>
                <span className="text-xs text-gray-500">{q.type}</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {q.name}
              </h3>
              <p className="text-gray-700">{q.text}</p>
            </div>

            {/* Question-level Logic */}
            <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded">
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">
                  Show Logic
                </label>
                <p className="text-sm text-gray-700 italic">
                  {q.showLogic.text || "—"}
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">
                  Terminate Logic
                </label>
                <p className="text-sm text-gray-700 italic">
                  {q.terminateLogic.text || "—"}
                </p>
              </div>
            </div>

            {/* Options/Stubs */}
            {q.options.length > 0 && (
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-3">
                  Options
                </label>
                <div className="space-y-2">
                  {q.options.map((opt) => (
                    <div
                      key={opt.id}
                      className="p-3 bg-gray-50 border border-gray-200 rounded"
                    >
                      <div className="flex items-start gap-3 mb-2">
                        <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded min-w-fit">
                          Code: {opt.id}
                        </span>
                        <span className="text-sm text-gray-800">{opt.text}</span>
                      </div>
                      {(opt.showLogic.text || opt.terminateLogic.text) && (
                        <div className="ml-12 text-xs text-gray-600 space-y-1">
                          {opt.showLogic.text && (
                            <div>
                              <span className="font-semibold">Show:</span> {opt.showLogic.text}
                            </div>
                          )}
                          {opt.terminateLogic.text && (
                            <div>
                              <span className="font-semibold">Terminate:</span> {opt.terminateLogic.text}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
