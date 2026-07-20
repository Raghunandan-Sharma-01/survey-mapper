import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { Node, Edge } from "reactflow";
import {
  Question,
  QuestionLogic,
  LoopBlock,
  SurveyBlock,
  BlockType,
  ConvertedQuestion,
} from "../types/logic";
import { buildGraphLevelLayout } from "../engine/graphBuilder";
import { readableCondition } from "../utils/logicHelpers";
import { parseSurveyData } from "../engine/parser/surveyParser";
import {
  buildSourceQuestions,
  adaptQuestions,
  resolveLogicMap,
} from "./helpers/surveyFlowHelpers";
import {
  buildLogicTracks,
  buildLinearPaths,
  deduplicatePaths,
  pruneSubsetPaths,
} from "./helpers/surveyPathHelpers";

/**
 * A question from either source: parsed survey JSON (Question) or a converted
 * document (ConvertedQuestion). Only ConvertedQuestion carries showLogic /
 * terminateLogic, so access is narrowed through the helpers below.
 */
type SourceQuestion = Question | ConvertedQuestion;

const getShowText = (q: SourceQuestion | undefined): string | null =>
  q && "showLogic" in q ? q.showLogic?.text ?? null : null;

const getTerminateText = (q: SourceQuestion | undefined): string | null =>
  q && "terminateLogic" in q ? q.terminateLogic?.text ?? null : null;

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

  setSurveyData: (data: any[]) => void;
  setConvertedQuestions: (questions: ConvertedQuestion[]) => void; // For document uploads
  updateLogic: (id: string, logic: Partial<QuestionLogic>) => void;
  getFlowElements: () => void;

  paths: string[][];
  activePathIndex: number | null; // null means "All Paths"
  setActivePath: (index: number | null) => void;

  blocks: Record<string, SurveyBlock>;
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
    paths: [],
    activePathIndex: null,

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

    setSurveyData: (rawData) => {
      const { refinedQuestions, blocks } = parseSurveyData(rawData);
      set({
        data: rawData,
        refinedQuestions,
        blocks,
        logicMap: {},
      });
      get().getFlowElements();
    },

    setConvertedQuestions: (questions) => {
      set({
        convertedQuestions: questions,
        currentView: "editor",
      });
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

    getFlowElements: () => {
      const { refinedQuestions, convertedQuestions, logicMap, blocks } = get();
      const sourceQuestions: SourceQuestion[] =
        refinedQuestions.length > 0 ? refinedQuestions : convertedQuestions;

      if (sourceQuestions.length === 0) return;

      const { dynamicBlocks, processedQuestions } = buildSourceQuestions(
        sourceQuestions,
        blocks
      );
      const mappedQuestions = adaptQuestions(processedQuestions);
      const resolvedLogicMap = resolveLogicMap(
        mappedQuestions,
        processedQuestions,
        logicMap
      );

      const { nodes, edges } = buildGraphLevelLayout(
        mappedQuestions,
        resolvedLogicMap,
        dynamicBlocks,
        readableCondition
      );

      const { pathableNodes, uniqueLogicTracks } = buildLogicTracks(nodes);
      const linearPaths = buildLinearPaths(pathableNodes, uniqueLogicTracks);
      let deduplicatedPaths = deduplicatePaths(linearPaths);
      deduplicatedPaths = pruneSubsetPaths(deduplicatedPaths);

      set({ nodes, edges, paths: deduplicatedPaths });
    },
  }))
);
