import { Node, Edge } from "reactflow";
import { ConvertedQuestion } from "../../types/logic";
import { buildDependencyModel, primaryLeaf, branchKey, branchLabel, Leaf, PaletteColor, QDep } from "./dependencyModel";
import { getFlowAxis } from "./flowAxis";

export interface FilterChip { key: string; label: string; color: PaletteColor; }

type FlowRow =
  | { kind: "spine"; it: QDep }
  | { kind: "branch"; key: string; leaf: Leaf; its: QDep[] }
  | { kind: "loop"; name: string; its: QDep[] };
type Row = FlowRow | { kind: "break"; name: string };
type GroupRow = Exclude<FlowRow, { kind: "spine" }>;

export function buildFlowLayout(
  questions: ConvertedQuestion[],
  expanded: Record<string, boolean> = {}
): { nodes: Node[]; edges: Edge[]; chips: FilterChip[] } {
  const { items, depCount, colorByKey, loopColor } = buildDependencyModel(questions);
  const ax = getFlowAxis();

  // ---- rows (with section-start breaks) ----
  const rows: Row[] = [];
  let cur: Row | null = null;
  for (const it of items) {
    if (it.isMarker) {
      const m = it.q.name.match(/^(?:sub)?section\s*start\s*[-–]\s*(.+)$/i);
      if (m) rows.push({ kind: "break", name: m[1].trim() });
      cur = null; continue;
    }
    if (it.loop) {
      if (cur?.kind === "loop" && cur.name === it.loop) cur.its.push(it);
      else { cur = { kind: "loop", name: it.loop, its: [it] }; rows.push(cur); }
      continue;
    }
    if (it.leaves.length) {
      const pl = primaryLeaf(it.leaves, depCount)!; const key = branchKey(pl);
      if (cur?.kind === "branch" && cur.key === key) cur.its.push(it);
      else { cur = { kind: "branch", key, leaf: pl, its: [it] }; rows.push(cur); }
      continue;
    }
    cur = null; rows.push({ kind: "spine", it });
  }

  const idOf = (r: GroupRow) => (r.kind === "branch" ? "branch:" : "loop:") + r.its[0].q.id;
  const card = (it: QDep, primary: Leaf | null) => ({
  id: it.q.id,
  name: it.q.name !== it.q.id ? it.q.name : "",
  type: it.q.type,
  tags: it.leaves
    .filter((l) => !primary || branchKey(l) !== branchKey(primary))
    .map((l) => ({ label: branchLabel(l), color: colorByKey[branchKey(l)] })),
});
  // ---- Pass A: assign rows to columns ----
  const MIN_COL = 320, MAX_COL = 1000;
  type Col = { name: string | null; rows: FlowRow[] };
  const cols: Col[] = [{ name: null, rows: [] }];
  let approx = ax.TOP;
  const openOf = (r: GroupRow) => expanded[idOf(r)] !== false;
  const alongOf = (r: FlowRow) => (r.kind === "spine" ? ax.spineLen(r.it) : ax.groupLen(r.its, openOf(r)));
  for (const row of rows) {
    const c = cols[cols.length - 1];
    if (row.kind === "break") {
      if (approx > MIN_COL) { cols.push({ name: row.name, rows: [] }); approx = ax.TOP; }
      else if (!c.name) c.name = row.name;
      continue;
    }
    if (approx > MAX_COL) { cols.push({ name: null, rows: [] }); approx = ax.TOP; }
    cols[cols.length - 1].rows.push(row);
    approx += alongOf(row) + ax.GAP;
  }
  const columns = cols.filter((c) => c.rows.length > 0);

  // ---- Pass B: column widths + x-origins ----
  const BRANCH_X = ax.posBranch(0).x;                 // 270
  const SPINE_W = (ax.spineStyle.width as number) ?? 200;
  const COL_GAP = 64;
  const blockW = (r: GroupRow) => (openOf(r) ? 236 : 170);
  const colWidth = (c: Col) => {
    let w = SPINE_W;
    for (const r of c.rows) if (r.kind !== "spine") w = Math.max(w, BRANCH_X + blockW(r));
    return w;
  };
  const widths = columns.map(colWidth);
  const origins: number[] = []; let x0 = 0;
  widths.forEach((w, i) => { origins[i] = x0; x0 += w + COL_GAP; });

  // ---- Pass C: emit ----
  const nodes: Node[] = []; const edges: Edge[] = [];
  const HEADER_TOP = 8, CONTENT_TOP = 48;
  const busEdge = (f: string, t: string) => edges.push({ id: `bus:${f}:${t}`, source: f, target: t, sourceHandle: ax.busHandles.s, targetHandle: ax.busHandles.t, type: "straight", style: { stroke: "#94a3b8", strokeWidth: 2 } });

  columns.forEach((c, ci) => {
    const ox = origins[ci];
    nodes.push({ id: `sec:${ci}`, type: "sectionHeader", position: { x: ox, y: HEADER_TOP }, style: { width: widths[ci] }, data: { name: c.name || `Section ${ci + 1}`, index: ci + 1 }, selectable: false, draggable: false, zIndex: 3 });

    let a = CONTENT_TOP; let prev: string | null = null;
    for (const row of c.rows) {
      if (row.kind === "spine") {
        const id = row.it.q.id; const p = ax.posSpine(a); p.x += ox;
        nodes.push({ id, type: "spineNode", position: p, style: ax.spineStyle, zIndex: 2, data: { id, name: row.it.q.name !== id ? row.it.q.name : "", type: row.it.q.type, terminate: row.it.terminate, termLabel: row.it.termLabel } });
        if (prev) busEdge(prev, id); prev = id; a += ax.spineLen(row.it) + ax.GAP;
        continue;
      }
      const id = idOf(row); const open = expanded[id] !== false; const len = ax.groupLen(row.its, open);
      const anchorId = `anchor:${ci}:${a}`; const apos = ax.posAnchor(a, len); apos.x += ox;
      nodes.push({ id: anchorId, type: "busAnchor", position: apos, data: {}, selectable: false, draggable: false, zIndex: 0 });
      if (prev) busEdge(prev, anchorId); prev = anchorId;
      const bpos = ax.posBranch(a); bpos.x += ox;
      if (row.kind === "branch") {
      const color = colorByKey[row.key];
      nodes.push({
        id, type: "branchNode", position: bpos, style: open ? { width: 236 } : undefined, zIndex: 1,
        data: {
          header: branchLabel(row.leaf), color, collapsed: !open, count: row.its.length,
          cards: row.its.map((it) => card(it, row.leaf)),   // ← mapped, NOT row.its
          filterKey: row.key,
        },
      });
      edges.push({ id: `tap:${id}`, source: anchorId, target: id, sourceHandle: ax.tapHandles.s, targetHandle: ax.tapHandles.t, type: "straight", style: { stroke: color.solid, strokeWidth: 2 } });
    } else {
      const color = loopColor[row.name] || { solid: "#d97706", tint: "#fffbeb" };
      nodes.push({
        id, type: "loopNode", position: bpos, style: open ? { width: 236 } : undefined, zIndex: 1,
        data: {
          name: row.name, color, collapsed: !open, count: row.its.length,
          cards: row.its.map((it) => card(it, null)),        // ← mapped
        },
      });
      edges.push({ id: `tap:${id}`, source: anchorId, target: id, sourceHandle: ax.tapHandles.s, targetHandle: ax.tapHandles.t, type: "straight", style: { stroke: color.solid, strokeWidth: 2, strokeDasharray: "6 4" } });
    }
      a += len + ax.GAP;
    }
  });

  const seen = new Set<string>(); const chips: FilterChip[] = [];
  rows.forEach((r) => { if (r.kind !== "branch" || seen.has(r.key)) return; seen.add(r.key); chips.push({ key: r.key, label: branchLabel(r.leaf), color: colorByKey[r.key] }); });
  return { nodes, edges, chips };
}