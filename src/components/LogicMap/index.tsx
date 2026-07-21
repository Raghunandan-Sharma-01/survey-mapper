import { useRef, useEffect, useCallback } from "react";
import ReactFlow, { Background, Controls, BackgroundVariant, MiniMap, ReactFlowInstance } from "reactflow";
import "reactflow/dist/style.css";
import { useSurveyStore } from "../../store/useSurveyStore";
import { nodeTypes } from "./nodes";
import FilterBar from "./FilterBar";

const LogicMap = () => {
  const { nodes, edges, layoutVersion, toggleExpand } = useSurveyStore();
  const rf = useRef<ReactFlowInstance | null>(null);

  const focusFirst = useCallback((inst: ReactFlowInstance) => {
    const first = inst.getNodes().find((n) => n.type === "spineNode");
    if (!first) {
      inst.fitView({ padding: 0.2 });
      return;
    }
    inst.setCenter(first.position.x + 100, first.position.y + 30, { zoom: 0.9, duration: 300 });
  }, []);

  // Re-focus only on real layout rebuilds (initial load, structural changes).
  useEffect(() => {
    const inst = rf.current;
    if (!inst) return;
    const t = setTimeout(() => focusFirst(inst), 60);
    return () => clearTimeout(t);
  }, [layoutVersion, focusFirst]);

  return (
    <div className="grow h-full bg-gray-50">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onInit={(inst) => {
          rf.current = inst;
          focusFirst(inst);
        }}
        minZoom={0.15}
        maxZoom={1.5}
        defaultEdgeOptions={{ type: "straight" }}
        onNodeClick={(_, node) => {
          if (node.type === "branchNode" || node.type === "loopNode") toggleExpand(node.id);
        }}
        proOptions={{ hideAttribution: true }}
      >
        <FilterBar
          onFocus={() => rf.current && focusFirst(rf.current)}
          onFit={() => rf.current?.fitView({ padding: 0.2, duration: 300 })}
        />
        <MiniMap nodeStrokeWidth={3} zoomable pannable className="bg-white" />
        <Controls />
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
      </ReactFlow>
    </div>
  );
};

export default LogicMap;