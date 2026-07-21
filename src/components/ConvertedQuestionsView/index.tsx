import { ConvertedQuestion } from "../../types/logic";
import { OptionsBlock } from "./OptionsBlock";

interface Props {
  questions: ConvertedQuestion[];
}

export default function ConvertedQuestionsView({ questions }: Props) {
  if (questions.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-gray-500 text-lg">No converted questions to display</p>
      </div>
    );
  }

  return (
    <div className="p-3 bg-slate-100 min-h-full">
      <div className="w-full space-y-2">
        <h2 className="mb-3 text-slate-800 text-xl font-bold">Survey Questions — Converted View</h2>
        {questions.map((q) => {
          if (q.type === "Structural Marker") {
            return (
              <div
                key={q.id}
                className="text-[11px] font-bold uppercase tracking-wide text-slate-500 border-b border-slate-300 pt-3 pb-1"
              >
                {q.name}
              </div>
            );
          }

          const hasTerm = !!q.terminateLogic?.text;
          return (
            <div
              key={q.id}
              className={`bg-white rounded-xl border border-slate-200 shadow-sm p-4 border-l-4 ${
                q.isGrid ? "border-l-sky-500" : hasTerm ? "border-l-red-500" : "border-l-purple-500"
              }`}
            >
              {/* Header */}
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded">{q.id}</span>
                <span className="text-[11px] text-slate-500 bg-slate-100 rounded-full px-2 py-0.5">
                  {q.isGrid ? `Grid · ${q.type}` : q.type}
                </span>
                {hasTerm && (
                  <span className="ml-auto text-[11px] font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded-md">
                    🛑 {q.terminateLogic.text}
                  </span>
                )}
              </div>
              {q.name && q.name !== q.id && <div className="text-xs text-slate-500 mb-1">{q.name}</div>}
              <p className="text-slate-700 text-sm mb-2">{q.text}</p>

              {/* Show-logic stub */}
              {q.showLogic?.text && (
                <div className="bg-purple-50 border border-dashed border-purple-400 rounded-lg px-2.5 py-1.5 text-purple-800 text-xs flex flex-wrap gap-1.5 items-center mb-2">
                  <span className="bg-purple-200 text-purple-800 uppercase font-bold text-[10px] tracking-wide px-1.5 py-0.5 rounded">
                    Show
                  </span>
                  {q.showLogic.text}
                </div>
              )}

              {/* Options */}
              {q.options.length > 0 && <OptionsBlock options={q.options} />}

              {/* Grid columns */}
              {q.isGrid && q.columns && q.columns.length > 0 && (
                <div className="mb-2">
                  <span className="inline-block text-[10px] font-bold uppercase tracking-wide bg-sky-100 text-sky-800 px-2 py-0.5 rounded mb-1">
                    Columns
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {q.columns.map((c) => (
                      <span key={c.id} className="text-[11px] bg-sky-50 border border-sky-200 text-sky-800 rounded px-1.5 py-0.5">
                        {c.id}. {c.text}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
