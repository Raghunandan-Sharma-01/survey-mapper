import { Panel } from "reactflow";
import { useSurveyStore } from "../../store/useSurveyStore";

interface FilterBarProps {
  onFocus: () => void;
  onFit: () => void;
}

/** Top-left control bar: focus/fit buttons + branch-condition filter chips. */
export default function FilterBar({ onFocus, onFit }: FilterBarProps) {
  const { chips, filter, toggleFilter, clearFilter } = useSurveyStore();

  return (
    <Panel position="top-left" className="m-3 space-y-2 max-w-[620px]">
      <div className="flex items-center gap-1 bg-white rounded-lg shadow px-2 py-1">
        <span className="text-[10px] font-semibold text-slate-500 mr-1">Layout</span>
        <span className="w-px h-4 bg-slate-200 mx-1" />
        <button onClick={onFocus} className="text-[11px] rounded px-2 py-0.5 bg-slate-100 text-slate-700">◎ Focus</button>
        <button onClick={onFit} className="text-[11px] rounded px-2 py-0.5 bg-slate-100 text-slate-700">⤢ Fit</button>
      </div>
      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 bg-white/90 rounded-lg shadow px-2 py-1">
          {chips.map((c) => {
            const active = filter.includes(c.key);
            return (
              <button
                key={c.key}
                onClick={() => toggleFilter(c.key)}
                className="text-[11px] font-semibold rounded px-2 py-0.5 border"
                style={
                  active
                    ? { background: c.color.solid, color: "#fff", borderColor: c.color.solid }
                    : { background: c.color.tint, color: c.color.solid, borderColor: c.color.solid }
                }
              >
                {c.label}
              </button>
            );
          })}
          {filter.length > 0 && (
            <button onClick={clearFilter} className="text-[11px] rounded px-2 py-0.5 border bg-white">clear</button>
          )}
        </div>
      )}
    </Panel>
  );
}
