import { memo } from "react";
import { Handle, Position } from "reactflow";

interface TerminateNodeData {
  logicText?: string | null;
}

const TerminateNode = ({ data }: { data: TerminateNodeData }) => {
  const hiddenHandle = "opacity-0";

  return (
    <div className="rounded-md border border-red-500 bg-red-50 px-2 py-1.5 text-[10px] text-red-700 shadow-sm min-w-[150px] max-w-[210px] text-center">
      <Handle type="target" position={Position.Top} id="top-t" className={hiddenHandle} />
      <Handle type="target" position={Position.Left} id="left-t" className={hiddenHandle} />
<Handle type="source" position={Position.Right} id="right-s" className={hiddenHandle} />

      <div className="font-bold">🛑 TERMINATE</div>
      {data.logicText && (
        <div className="mt-0.5 leading-snug break-words whitespace-pre-wrap text-left text-[9px] font-medium">
          {data.logicText}
        </div>
      )}
    </div>
  );
};

export default memo(TerminateNode);
