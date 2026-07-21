import { useMemo, useRef, useEffect, useCallback } from "react";
import ReactFlow, { Background, Controls, BackgroundVariant, MiniMap, Panel, ReactFlowInstance } from "reactflow";
import "reactflow/dist/style.css";
import { useSurveyStore } from "../../store/useSurveyStore";
import { SpineNode, BranchNode, LoopNode, BusAnchor, SectionHeader } from "./FlowNodes";

const LogicMap = () => {
  const { nodes, edges, chips, filter, toggleFilter, clearFilter, direction, layoutVersion, toggleExpand } = useSurveyStore();
  const rf = useRef<ReactFlowInstance | null>(null);
  const nodeTypes = useMemo(() => ({ spineNode: SpineNode, branchNode: BranchNode, loopNode: LoopNode, busAnchor: BusAnchor, sectionHeader: SectionHeader }), []);

  const focusFirst = useCallback((inst: ReactFlowInstance) => {
    const first = inst.getNodes().find((n) => n.type === "spineNode");
    if (!first) { inst.fitView({ padding: 0.2 }); return; }
    inst.setCenter(first.position.x + 100, first.position.y + 30, { zoom: 0.9, duration: 300 });
  }, []);
  useEffect(() => {
    const inst = rf.current;
    if (!inst) return;
    const t = setTimeout(() => focusFirst(inst), 60);
    return () => clearTimeout(t);
  }, [layoutVersion, focusFirst]);

  return (
    <div className="grow h-full bg-gray-50">
      <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes}
        onInit={(inst) => { rf.current = inst; focusFirst(inst); }}
        minZoom={0.15} maxZoom={1.5} defaultEdgeOptions={{ type: "straight" }} 
        onNodeClick={(_, node) => { if (node.type === "branchNode" || node.type === "loopNode") toggleExpand(node.id); }}
        proOptions={{ hideAttribution: true }}>
        <Panel position="top-left" className="m-3 space-y-2 max-w-[620px]">
          {/* controls */}
          <div className="flex items-center gap-1 bg-white rounded-lg shadow px-2 py-1">
            <span className="text-[10px] font-semibold text-slate-500 mr-1">Layout</span>
            <span className="w-px h-4 bg-slate-200 mx-1" />
            <button onClick={() => rf.current && focusFirst(rf.current)} className="text-[11px] rounded px-2 py-0.5 bg-slate-100 text-slate-700">◎ Focus</button>
            <button onClick={() => rf.current?.fitView({ padding: 0.2, duration: 300 })} className="text-[11px] rounded px-2 py-0.5 bg-slate-100 text-slate-700">⤢ Fit</button>
          </div>
          {/* filter chips */}
          {chips.length > 0 && (
            <div className="flex flex-wrap items-center gap-1 bg-white/90 rounded-lg shadow px-2 py-1">
              {chips.map((c) => {
                const active = filter.includes(c.key);
                return (
                  <button key={c.key} onClick={() => toggleFilter(c.key)} className="text-[11px] font-semibold rounded px-2 py-0.5 border"
                    style={active ? { background: c.color.solid, color: "#fff", borderColor: c.color.solid } : { background: c.color.tint, color: c.color.solid, borderColor: c.color.solid }}>
                    {c.label}
                  </button>
                );
              })}
              {filter.length > 0 && <button onClick={clearFilter} className="text-[11px] rounded px-2 py-0.5 border bg-white">clear</button>}
            </div>
          )}
        </Panel>
        <MiniMap nodeStrokeWidth={3} zoomable pannable className="bg-white" />
        <Controls />
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
      </ReactFlow>
    </div>
  );
};
export default LogicMap;