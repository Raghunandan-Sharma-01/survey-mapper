import { ConvertedQuestion } from "../../types/logic";
import { buildCardModel } from "../../utils/cardModel";
import { niceScroll } from "../../utils/ui";

export default function CardGrid({ questions }: { questions: ConvertedQuestion[] }) {
  if (!questions || questions.length === 0) return null;
  const cards = buildCardModel(questions);

  return (
    <div className="h-full flex flex-col bg-slate-100">
      <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-500 bg-white border-b border-slate-200">
        Logic Cards
      </div>
       <div className={`flex-1 overflow-y-auto p-2 ${niceScroll}`}>
        <div className="grid grid-cols-3 gap-2">
          {cards.map((c, i) => (
            <div
              key={c.id + i}
              className="rounded-lg border border-slate-200 bg-white p-2 flex flex-col gap-1"
              style={c.accent ? { borderLeft: `3px solid ${c.accent.solid}` } : undefined}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="font-bold text-slate-900 text-xs truncate">{c.label}</span>
                <span className="text-[9px] text-slate-500 bg-slate-100 rounded-full px-1.5 py-0.5 whitespace-nowrap">
                  {c.type}
                </span>
              </div>

              {c.isLoopAnchor && c.accent && (
                <span className="self-start text-[9px] font-bold uppercase rounded px-1 py-0.5"
                      style={{ background: c.accent.tint, color: c.accent.solid }}>
                  ⟳ Loop
                </span>
              )}

              {c.isSource && (
                <div className="flex items-center gap-1">
                  <span className="text-[9px] font-bold uppercase rounded px-1 py-0.5 bg-slate-200 text-slate-700">
                    Drives {c.dependentCount}
                  </span>
                  <div className="flex gap-0.5">
                    {c.swatches.map((s, si) => (
                      <span key={si} className="w-3 h-3 rounded-sm border border-white" style={{ background: s.solid }} />
                    ))}
                  </div>
                </div>
              )}

              {c.tags.length > 0 && (
                <div className="flex flex-wrap items-center gap-1">
                  {c.branchOp && (
                    <span className="text-[8px] font-bold uppercase text-slate-400">
                      {c.branchOp === "AND" ? "ALL" : "ANY"}
                    </span>
                  )}
                  {c.tags.map((t, ti) => (
                    <span key={ti} className="text-[9px] font-semibold rounded px-1 py-0.5 border"
                          style={{ background: t.color.tint, color: t.color.solid, borderColor: t.color.solid }}>
                      {t.label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}