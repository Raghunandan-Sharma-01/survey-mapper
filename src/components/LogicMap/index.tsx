import { useMemo, useState, useCallback } from "react";
import ReactFlow, {
  Background,
  Controls,
  BackgroundVariant,
  MiniMap,
  Panel,
  ReactFlowInstance,
} from "reactflow";
import "reactflow/dist/style.css";

import { useSurveyStore } from "../../store/useSurveyStore";
import QuestionNode from "./QuestionNode";
import TerminateNode from "./TerminateNode";
import PathSelector from "./PathSelector";
import { applyHoverHighlight } from "../../utils/flowInteractions";

const MergeNode = () => <div style={{ width: 1, height: 1 }} />;

const LogicMap = () => {
  const { nodes, edges } = useSurveyStore();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const nodeTypes = useMemo(
    () => ({
      questionNode: QuestionNode,
      terminateNode: TerminateNode,
      merge: MergeNode, // real 1x1 node (rendering null breaks measurement)
    }),
    []
  );
  const defaultEdgeOptions = useMemo(() => ({ type: "smoothstep" }), []);

  const displayEdges = useMemo(
    () => applyHoverHighlight(edges, hoveredId),
    [edges, hoveredId]
  );

  // Auto-zoom to the FIRST question node on load.
  const focusFirst = useCallback((instance: ReactFlowInstance) => {
    const first = instance.getNodes().find((n) => n.type === "questionNode");
    if (!first) {
      instance.fitView({ padding: 0.15 }); // fallback if not ready
      return;
    }
    const x = first.position.x + (first.width ?? 210) / 2;
    const y = first.position.y + (first.height ?? 84) / 2;
    instance.setCenter(x, y, { zoom: 1, duration: 400 });
  }, []);

  return (
    <div className="grow h-full bg-gray-50">
      <ReactFlow
        nodes={nodes}
        edges={displayEdges}
        nodeTypes={nodeTypes}
        onInit={focusFirst}
        onNodeMouseEnter={(_, node) => setHoveredId(node.id)}
        onNodeMouseLeave={() => setHoveredId(null)}
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.2}
        maxZoom={1.5}
        defaultEdgeOptions={defaultEdgeOptions}
        proOptions={{ hideAttribution: true }}
      >
        <Panel position="top-left" className="m-4">
          <PathSelector />
        </Panel>

        <MiniMap nodeStrokeWidth={3} zoomable pannable className="bg-white" />
        <Controls />
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
      </ReactFlow>
    </div>
  );
};

export default LogicMap;