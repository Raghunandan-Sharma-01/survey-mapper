import { memo } from "react";
import { Handle, Position } from "reactflow";

const hide = "opacity-0";

/** Expanded branch/loop block: header + 2-column grid of question cards. */
const Cards = ({ data, dashed }: { data: any; dashed?: boolean }) => (
  <div
    className="rounded-lg border bg-white shadow-sm overflow-hidden w-full"
    style={{ borderColor: data.color.solid, borderStyle: dashed ? "dashed" : "solid" }}
  >
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
            <span
              key={i}
              className="mt-0.5 inline-block max-w-full truncate text-[8px] font-semibold rounded px-1"
              style={{ background: t.color.tint, color: t.color.solid, border: `1px solid ${t.color.solid}` }}
            >
              {t.label}
            </span>
          ))}
        </div>
      ))}
    </div>
  </div>
);

/** Collapsed branch/loop block: a single condition pill with a count. */
const Pill = ({ data, dashed }: { data: any; dashed?: boolean }) => (
  <div
    className="rounded-md px-2 py-1 text-[10px] font-bold text-white shadow-sm whitespace-nowrap cursor-pointer border"
    style={{ background: data.color.solid, borderColor: data.color.solid, borderStyle: dashed ? "dashed" : "solid" }}
  >
    <Handle id="l" type="target" position={Position.Left} className={hide} />
    <Handle id="t" type="target" position={Position.Top} className={hide} />
    {dashed ? `⟲ ${data.name}` : data.header} · {data.count}
  </div>
);

export const BranchNode = memo((p: { data: any }) => (p.data.collapsed ? <Pill data={p.data} /> : <Cards data={p.data} />));
export const LoopNode = memo((p: { data: any }) => (p.data.collapsed ? <Pill data={p.data} dashed /> : <Cards data={p.data} dashed />));
