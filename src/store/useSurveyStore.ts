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
import {
  buildGraphLevelLayout,
  calculateAllPaths,
} from "../engine/graphBuilder";
import _ from "lodash";
import {
  readableCondition,
  resolveEffectiveLogic,
} from "../utils/logicHelpers";
import { parseSurveyData } from "../engine/surveyParser";
import { parseTextToLogicNode } from "../utils/htmlParsing/logicParser";

interface SurveyStore {
  data: any[];
  refinedQuestions: Question[];
  convertedQuestions: ConvertedQuestion[]; // From document uploads
  logicMap: Record<string, QuestionLogic>;
  loopBlocks: LoopBlock[];
  nodes: Node[];
  edges: Edge[];

  // 1. ADD THESE BACK TO THE INTERFACE
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
      // Use the new parser!
      const { refinedQuestions, blocks } = parseSurveyData(rawData);

      const initialLogicMap: Record<string, QuestionLogic> = {};

      set({
        data: rawData,
        refinedQuestions,
        blocks, // Save the structural blocks to the store!
        logicMap: initialLogicMap,
      });

      get().getFlowElements();
    },

    setConvertedQuestions: (questions) => {
      set({
        convertedQuestions: questions,
        currentView: "editor", // Switch to editor view when converted data is loaded
      });
      // FIX: Calculate the initial graph elements in the background
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
            transition: "opacity 0.3s ease", // Smooth fade effect
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
      
      // 1. THE BRIDGE: Use refined if available, otherwise fallback to converted DOCX data
      const sourceQuestions = refinedQuestions.length > 0 ? refinedQuestions : convertedQuestions;

      if (sourceQuestions.length === 0) {
        console.warn("Graph generation aborted: No questions available.");
        return;
      }

      // 2. ADAPT: Map ConvertedQuestions to look like standard Questions for the layout engine
      const mappedQuestions = sourceQuestions.map((q: any) => ({
        id: q.id as unknown as number, // Override type mismatch (string vs number)
        uniqueKey: q.id.toString(),
        name: q.name || q.id,
        fullName: q.text || q.name, 
        text: q.text || null, // FIX: Added missing required property
        type: q.type,
        parentBlocks: q.parentBlocks || [],
        sectionName: q.parentBlocks?.[0] || "", 
        rows: [],
        columns: [],
        listOrder: 0
      })) as unknown as Question[]; // Double cast to ensure TS accepts the bridge

      // 3. Resolve Logic Map
      const resolvedLogicMap: Record<string, QuestionLogic> = {};
      mappedQuestions.forEach((question) => {
        const convertedQ = convertedQuestions.find(c => c.id.toString() === question.id.toString());
        
        if (convertedQ && (convertedQ.showLogic?.text || convertedQ.terminateLogic?.text)) {
           // THE MAGIC HAPPENS HERE: Translate the text to AST!
           resolvedLogicMap[question.id.toString()] = {
              show: parseTextToLogicNode(convertedQ.showLogic.text),
              terminate: parseTextToLogicNode(convertedQ.terminateLogic.text),
           };
        } else {
           resolvedLogicMap[question.id.toString()] = resolveEffectiveLogic(
             question.id.toString(),
             mappedQuestions,
             blocks,
             logicMap
           );
        }
      });
      
      // 4. Generate Graph using Dagre Layout Engine
      const { nodes, edges } = buildGraphLevelLayout(
        mappedQuestions,
        resolvedLogicMap,
        blocks,
        readableCondition
      );

      const paths = calculateAllPaths(nodes, edges);
      set({ nodes, edges, paths });
    },
  }))
);
