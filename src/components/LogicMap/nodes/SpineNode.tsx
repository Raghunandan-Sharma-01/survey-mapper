import { memo } from "react";
import { Handle, Position } from "reactflow";

const hide = "opacity-0";

export const SpineNode = memo(({ data }: { data: any }) => (
  <div className="rounded-lg border border-slate-300 bg-white shadow-sm px-2 py-1 w-full">
    <Handle id="t" type="target" position={Position.Top} className={hide} />
    <Handle id="l" type="target" position={Position.Left} className={hide} />
    <Handle id="b" type="source" position={Position.Bottom} className={hide} />
    <Handle id="r" type="source" position={Position.Right} className={hide} />
    <div className="flex items-center justify-between gap-2 whitespace-nowrap">
      <span className="text-[11px] font-bold text-slate-900">{data.id}</span>
      <span className="text-[8px] text-slate-400">{data.type}</span>
    </div>
    {data.name && (
      <div className="text-[9px] text-slate-500 whitespace-nowrap overflow-hidden text-ellipsis">{data.name}</div>
    )}
    {data.terminate && (
      <div className="mt-1 text-[9px] font-bold text-red-700 bg-red-50 border border-red-200 rounded px-1 py-0.5 leading-tight break-words">
        Terminate{data.termLabel ? ` · ${data.termLabel}` : ""}
      </div>
    )}
  </div>
));
