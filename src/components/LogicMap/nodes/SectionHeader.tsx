import { memo } from "react";

export const SectionHeader = memo(({ data }: { data: any }) => (
  <div
    className="h-8 flex items-center gap-2 rounded-t-md border-b-2 border-slate-300 bg-slate-50 px-3"
    style={{ width: "100%" }}
  >
    <span className="text-[10px] font-extrabold text-white bg-slate-500 rounded-full w-5 h-5 flex items-center justify-center shrink-0">
      {data.index}
    </span>
    <span className="text-[11px] font-extrabold uppercase tracking-wide text-slate-600 truncate">{data.name}</span>
  </div>
));
