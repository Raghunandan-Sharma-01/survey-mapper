import { memo } from "react";
import { Handle, Position } from "reactflow";

const hide = "opacity-0";

export const BusAnchor = memo(() => (
  <div style={{ width: 1, height: 1 }}>
    <Handle id="t" type="target" position={Position.Top} className={hide} />
    <Handle id="l" type="target" position={Position.Left} className={hide} />
    <Handle id="b" type="source" position={Position.Bottom} className={hide} />
    <Handle id="r" type="source" position={Position.Right} className={hide} />
  </div>
));
