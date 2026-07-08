import { Edge } from "reactflow";
 
export function applyHoverHighlight(edges: Edge[], hoveredId: string | null): Edge[] {
  return edges.map((e) => {
    const kind = (e.data as any)?.kind;
    if (kind !== "logic" && kind !== "terminate") return e;
 
    const touches = hoveredId && (e.source === hoveredId || e.target === hoveredId);
    if (kind === "logic") {
      return { ...e, hidden: !touches }; // logic: only visible on hover
    }
    // terminate: always visible but dim; full strength on hover
    return { ...e, style: { ...e.style, opacity: touches ? 1 : 0.45 } };
  });
}