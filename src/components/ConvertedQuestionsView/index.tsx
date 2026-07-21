import React from "react";
import { ConvertedQuestion, ConvertedOption } from "../../types/logic";

interface Props { questions: ConvertedQuestion[]; }

function OptionRow({ opt, hideLogic }: { opt: ConvertedOption; hideLogic?: boolean }) {
  const rule = hideLogic ? null : (opt.showLogic?.text || opt.terminateLogic?.text || null);
  return (
    <li className="flex items-start gap-2 py-1 text-sm">
      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 rounded px-1.5 py-0.5 mt-0.5">{opt.id}</span>
      <span className="text-slate-800 flex-1">{opt.text}</span>
      {rule && <span className="ml-auto shrink-0 max-w-[45%] text-[10px] text-amber-800 bg-amber-100 rounded px-1.5 py-0.5">{rule}</span>}
    </li>
  );
}

function OptionsBlock({ options }: { options: ConvertedOption[] }) {
  if (options.length === 0) return null;
  const keyOf = (o?: ConvertedOption) => (o ? o.showLogic?.text || o.terminateLogic?.text || null : null);

  return (
    <ul className="divide-y divide-slate-100">
      {options.map((o, i) => {
        const k = keyOf(o);
        const prevSame = i > 0 && keyOf(options[i - 1]) === k;
        const nextSame = i < options.length - 1 && keyOf(options[i + 1]) === k;
        const inGroup = !!k && (prevSame || nextSame);   // shared by a neighbor → it's a group
        const groupStart = inGroup && !prevSame;          // first row of the run
        return (
          <React.Fragment key={o.id}>
            {groupStart && (
              <li className="pt-2 pb-1">
                <span className="inline-block text-[10px] font-bold uppercase tracking-wide bg-amber-100 text-amber-800 px-2 py-0.5 rounded">{k}</span>
              </li>
            )}
            <OptionRow opt={o} hideLogic={inGroup} />
          </React.Fragment>
        );
      })}
    </ul>
  );
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
        <h2 className="mb-3 text-slate-800 text-xl font-bold">
          Survey Questions — Converted View
        </h2>
        {questions.map((q) => {
          if (q.type === "Structural Marker") {
            return (
              <div key={q.id} className="text-[11px] font-bold uppercase tracking-wide text-slate-500 border-b border-slate-300 pt-3 pb-1">
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

              {/* Options stub-list */}
              {q.options.length > 0 && (
                <OptionsBlock options={q.options} />
              )}
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