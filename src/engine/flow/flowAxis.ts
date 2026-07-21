import { QDep } from "./dependencyModel";

export interface Handles { s: string; t: string; }
export interface NodeSize { width?: number; height?: number; }
export interface XY { x: number; y: number; }
export interface FlowAxis {
  TOP: number; GAP: number;
  spineStyle: NodeSize;
  blockStyle?: NodeSize;
  busHandles: Handles;
  tapHandles: Handles;
  spineLen(it: QDep): number;
  groupLen(its: QDep[], expanded: boolean): number;
  posSpine(along: number): XY;
  posBranch(along: number): XY;
  posAnchor(along: number, len: number): XY;
}

const SPINE_X = 20, SPINE_W = 200, BUS = SPINE_X + SPINE_W / 2; // 120
const BRANCH_X = 270, TOP = 24, GAP = 16;

const termLines = (it: QDep) => (!it.terminate ? 0 : Math.max(1, Math.ceil((it.termLabel?.length ?? 24) / 26)));
const spineHeight = (it: QDep) => 30 + (it.q.name !== it.q.id ? 14 : 0) + (it.terminate ? 12 + termLines(it) * 11 : 0);
const oneCardHeight = (its: QDep[]) => {
  const anyName = its.some((it) => it.q.name !== it.q.id);
  const extraTags = its.reduce((m, it) => Math.max(m, Math.max(0, it.leaves.length - 1)), 0);
  return 22 + (anyName ? 12 : 0) + 12 + extraTags * 16;
};
const groupHeight = (its: QDep[]) => 24 + oneCardHeight(its) + 14;

export function getFlowAxis(): FlowAxis {
  return {
    TOP, GAP,
    spineStyle: { width: SPINE_W },
    blockStyle: undefined,
    busHandles: { s: "b", t: "t" },
    tapHandles: { s: "r", t: "l" },
    spineLen: (it) => spineHeight(it),
  groupLen: (its, open) => {
    if (!open) return 34;                       // collapsed pill
    const rows = Math.ceil(its.length / 2);     // 2-column grid
    return 30 + rows * 64 + 12;                 // header + generous row height + padding
  },
    posSpine: (a) => ({ x: SPINE_X, y: a }),
    posBranch: (a) => ({ x: BRANCH_X, y: a }),
    posAnchor: (a, len) => ({ x: BUS, y: a + len / 2 }),
  };
}