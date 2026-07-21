import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { Node, Edge } from "reactflow";
import {
  Question,
  QuestionLogic,
  LoopBlock,
  SurveyBlock,
  ConvertedQuestion,
} from "../types/logic";
import { buildFlowLayout, FilterChip } from "../engine/flow/buildFlowLayout";

/**
 * A question from either source: parsed survey JSON (Question) or a converted
 * document (ConvertedQuestion). Only ConvertedQuestion carries showLogic /
 * terminateLogic, so access is narrowed through the helpers below.
 */
interface SurveyStore {
  data: any[];
  refinedQuestions: Question[];
  convertedQuestions: ConvertedQuestion[]; // From document uploads
  logicMap: Record<string, QuestionLogic>;
  loopBlocks: LoopBlock[];
  nodes: Node[];
  edges: Edge[];

  currentView: "editor" | "map";
  setView: (view: "editor" | "map") => void;

  setConvertedQuestions: (questions: ConvertedQuestion[]) => void; // For document uploads
  updateLogic: (id: string, logic: Partial<QuestionLogic>) => void;
  getFlowElements: () => void;

  paths: string[][];
  activePathIndex: number | null; // null means "All Paths"
  setActivePath: (index: number | null) => void;

  blocks: Record<string, SurveyBlock>;
  direction: "vertical" | "horizontal";
  chips: FilterChip[];
  filter: string[];
  toggleFilter: (key: string) => void;
  clearFilter: () => void;
  applyFilter: () => void;
  layoutVersion: number; 

  expanded: Record<string, boolean>;
  rebuildGraph: () => void;
  toggleExpand: (id: string) => void;
}

export const useSurveyStore = create<SurveyStore>()(
  devtools((set, get) => ({
    data: [],
    refinedQuestions: [],
    convertedQuestions: [],
    logicMap: {},
    loopBlocks: [],
    nodes: [],
    edges: [],
    chips: [],
    filter: {},
    paths: [],
    activePathIndex: null,
    layoutVersion: 0,
    expanded: {},

    // 2. ADD THE INITIAL STATE
    currentView: "editor",

    // 3. ADD THE FUNCTION IMPLEMENTATION
    setView: (view) => {
      set({ currentView: view });
      // FIX: Force the graph to calculate when we switch to the map view!
      if (view === "map") {
        get().getFlowElements();
      }
    },

    setConvertedQuestions: (questions) => {
  set({ convertedQuestions: questions, currentView: "editor", expanded: {}, filter: [] });
  get().getFlowElements();
},

    updateLogic: (id, logic) => {
      set((state) => ({
        logicMap: {
          ...state.logicMap,
          [id]: {
            ...(state.logicMap[id] || {}),
            ...logic,
          },
        },
      }));
      get().getFlowElements();
    },

    setActivePath: (index) => {
      set((state) => {
        const activePath = index !== null ? state.paths[index] : null;
        const updatedNodes = state.nodes.map((node) => ({
          ...node,
          style: {
            ...node.style,
            opacity:
              activePath === null || activePath.includes(node.id) ? 1 : 0.2,
            transition: "opacity 0.3s ease",
          },
        }));

        const updatedEdges = state.edges.map((edge) => {
          const isActive =
            activePath === null ||
            (activePath.includes(edge.source) &&
              activePath.includes(edge.target));

          return {
            ...edge,
            style: {
              ...edge.style,
              opacity: isActive ? 1 : 0.1,
              transition: "opacity 0.3s ease",
            },
          };
        });

        return {
          activePathIndex: index,
          nodes: updatedNodes,
          edges: updatedEdges,
        };
      });
    },

    rebuildGraph: () => {
  const { convertedQuestions, expanded } = get();
  if (!convertedQuestions.length) return;
  const { nodes, edges, chips } = buildFlowLayout(convertedQuestions, expanded);
  set({ nodes, edges, chips });
  get().applyFilter();
},
getFlowElements: () => { get().rebuildGraph(); set({ layoutVersion: get().layoutVersion + 1 }); }, // bump → re-focus
toggleExpand: (id) => { set((s) => ({ expanded: { ...s.expanded, [id]: s.expanded[id] === false ? true : false } })); get().rebuildGraph(); },
toggleFilter: (key) => { set((s) => ({ filter: s.filter.includes(key) ? s.filter.filter((k) => k !== key) : [...s.filter, key] })); get().applyFilter(); },
    clearFilter: () => { set({ filter: [] }); get().applyFilter(); },
    applyFilter: () => set((s) => {
      const sel = s.filter; const active = sel.length > 0;
      const on = (n: any) => { const k = n.data?.filterKey; return k ? sel.includes(k) : true; };
      const nodes = s.nodes.map((n) => ({ ...n, style: { ...n.style, opacity: !active || on(n) ? 1 : 0.12, transition: "opacity .2s" } }));
      const op: Record<string, number> = Object.fromEntries(nodes.map((n) => [n.id, n.style!.opacity as number]));
      const edges = s.edges.map((e) => ({ ...e, style: { ...e.style, opacity: !active ? 1 : Math.min(op[e.source] ?? 1, op[e.target] ?? 1) } }));
      return { nodes, edges };
    }),
  }))
);
