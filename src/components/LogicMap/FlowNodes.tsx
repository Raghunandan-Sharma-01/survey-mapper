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
    {data.name && <div className="text-[9px] text-slate-500 whitespace-nowrap overflow-hidden text-ellipsis">{data.name}</div>}
    {data.terminate && (
  <div className="mt-1 text-[9px] font-bold text-red-700 bg-red-50 border border-red-200 rounded px-1 py-0.5 leading-tight break-words">
    Terminate{data.termLabel ? ` · ${data.termLabel}` : ""}
  </div>
)}
</div>
));

const Cards = ({ data, dashed }: { data: any; dashed?: boolean }) => (
  <div className="rounded-lg border bg-white shadow-sm overflow-hidden w-full" style={{ borderColor: data.color.solid, borderStyle: dashed ? "dashed" : "solid" }}>
    <Handle id="l" type="target" position={Position.Left} className={hide} />
    <Handle id="t" type="target" position={Position.Top} className={hide} />
    <div className="px-2 py-0.5 text-[9px] font-bold text-white truncate" style={{ background: data.color.solid }}>
      {dashed ? `⟲ ${data.name}` : data.header}
    </div>
    <div className="grid grid-cols-2 gap-1 p-1">
      {data.cards.map((c: any) => (
        <div key={c.id} className="rounded border bg-white px-1.5 py-1 overflow-hidden" style={{ borderColor: data.color.solid }}>
          <div className="text-[10px] font-bold text-slate-900 truncate">{c.id}</div>
          {c.name && <div className="text-[8px] text-slate-400 truncate">{c.name}</div>}
          <div className="text-[8px] text-slate-400 truncate">{c.type}</div>
          {c.tags?.map((t: any, i: number) => (
            <span key={i} className="mt-0.5 inline-block max-w-full truncate text-[8px] font-semibold rounded px-1"
              style={{ background: t.color.tint, color: t.color.solid, border: `1px solid ${t.color.solid}` }}>{t.label}</span>
          ))}
        </div>
      ))}
    </div>
  </div>
);

const Pill = ({ data, dashed }: { data: any; dashed?: boolean }) => (
  <div className="rounded-md px-2 py-1 text-[10px] font-bold text-white shadow-sm whitespace-nowrap cursor-pointer border"
    style={{ background: data.color.solid, borderColor: data.color.solid, borderStyle: dashed ? "dashed" : "solid" }}>
    <Handle id="l" type="target" position={Position.Left} className={hide} />
    <Handle id="t" type="target" position={Position.Top} className={hide} />
    {dashed ? `⟲ ${data.name}` : data.header} · {data.count}
  </div>
);

export const BranchNode = memo((p: { data: any }) => (p.data.collapsed ? <Pill data={p.data} /> : <Cards data={p.data} />));
export const LoopNode = memo((p: { data: any }) => (p.data.collapsed ? <Pill data={p.data} dashed /> : <Cards data={p.data} dashed />));

export const BusAnchor = memo(() => (
  <div style={{ width: 1, height: 1 }}>
    <Handle id="t" type="target" position={Position.Top} className={hide} />
    <Handle id="l" type="target" position={Position.Left} className={hide} />
    <Handle id="b" type="source" position={Position.Bottom} className={hide} />
    <Handle id="r" type="source" position={Position.Right} className={hide} />
  </div>
));

export const SectionHeader = memo(({ data }: { data: any }) => (
  <div className="h-8 flex items-center gap-2 rounded-t-md border-b-2 border-slate-300 bg-slate-50 px-3" style={{ width: "100%" }}>
    <span className="text-[10px] font-extrabold text-white bg-slate-500 rounded-full w-5 h-5 flex items-center justify-center shrink-0">{data.index}</span>
    <span className="text-[11px] font-extrabold uppercase tracking-wide text-slate-600 truncate">{data.name}</span>
  </div>
));