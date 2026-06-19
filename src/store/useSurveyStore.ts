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
      
      const sourceQuestions = refinedQuestions.length > 0 ? refinedQuestions : convertedQuestions;
      
      if (sourceQuestions.length === 0) {
        console.warn("Graph generation aborted: No questions available.");
        return;
      }

      // --- 1. DYNAMIC BLOCK REBUILDER (No Hardcoding!) ---
      const dynamicBlocks: Record<string, any> = { ...blocks };
      const activeBlocks: any[] = []; // Tracks open blocks like a stack
      let blockCounter = 1;

      const processedQuestions: any[] = [];

      for (const q of sourceQuestions) {
        const name = (q.name || "").trim();
        const text = (q.text || "").trim();
        const isMarker = q.type === "Structural Marker";

        if (isMarker) {
          const lowerText = text.toLowerCase();
          
          let type = "Section";
          if (lowerText.includes("loop")) type = "Loop";
          else if (lowerText.includes("subsection")) type = "Subsection";
          else if (lowerText.includes("page")) type = "Page";

          if (lowerText.includes("start")) {
            const cleanName = text.replace(/^(loop|subsection|section|page)\s*start\s*-?\s*/i, "").trim() || type;
            const blockId = `block_${type.toLowerCase()}_${blockCounter++}`;
            
            dynamicBlocks[blockId] = {
              id: blockId,
              type: type as any, // Cast to BlockType if needed
              name: cleanName,
              // FIX: Assert as ConvertedQuestion to safely access showLogic
              logicText: (q as ConvertedQuestion).showLogic?.text || "", 
              firstQuestionId: null,
              lastQuestionId: null
            };
            activeBlocks.push(dynamicBlocks[blockId]);
            
          } 
          else if (lowerText.includes("end")) {
            for (let i = activeBlocks.length - 1; i >= 0; i--) {
              if (activeBlocks[i].type === type) {
                activeBlocks.splice(i, 1);
                break;
              }
            }
          }
          continue; 
        }

        // --- MERGE CONTROLLER QUESTIONS ---
        const currentLoop = activeBlocks.find(b => b.type === "Loop");
        if (currentLoop && name === currentLoop.name) {
          // FIX: Assert as ConvertedQuestion here too
          const qAsConverted = q as ConvertedQuestion;
          if (qAsConverted.showLogic?.text) {
            const existingLogic = dynamicBlocks[currentLoop.id].logicText;
            dynamicBlocks[currentLoop.id].logicText = existingLogic 
              ? `${existingLogic}\n${qAsConverted.showLogic.text}` 
              : qAsConverted.showLogic.text;
          }
          continue; 
        }
        // Tag standard questions with ALL active nested blocks
        processedQuestions.push({
          ...q,
          parentBlocks: activeBlocks.map(b => b.id),
        });
      }

      // --- 2. ADAPT QUESTIONS ---
      const mappedQuestions = processedQuestions.map((q: any) => ({
        id: q.id as unknown as number, 
        uniqueKey: q.id.toString(),
        name: q.name || q.id,
        fullName: q.name || q.id, 
        text: q.text || null, 
        type: q.type,
        parentBlocks: q.parentBlocks, 
        sectionName: q.parentBlocks?.[0] || "", 
        rows: [],
        columns: [],
        listOrder: 0
      })) as unknown as Question[];

      // --- 3. RESOLVE LOGIC MAP ---
      const resolvedLogicMap: Record<string, any> = {};
      mappedQuestions.forEach((question) => {
        const convertedQ = processedQuestions.find(c => c.id.toString() === question.id.toString());
        
        if (convertedQ && (convertedQ.showLogic?.text || convertedQ.terminateLogic?.text)) {
           resolvedLogicMap[question.id.toString()] = {
              show: parseTextToLogicNode(convertedQ.showLogic.text), 
              terminate: parseTextToLogicNode(convertedQ.terminateLogic.text),
              rawShowText: convertedQ.showLogic.text, 
              rawTerminateText: convertedQ.terminateLogic.text
           };
        } else {
           resolvedLogicMap[question.id.toString()] = resolveEffectiveLogic(
             question.id.toString(),
             mappedQuestions,
             dynamicBlocks,
             logicMap
           );
        }
      });

      // --- 4. GENERATE GRAPH ---
      const { nodes, edges } = buildGraphLevelLayout(
        mappedQuestions,
        resolvedLogicMap,
        dynamicBlocks, 
        readableCondition
      );

      // --- 5. DETERMINISTIC TRACK CALCULATOR ---
      const pathableNodes = nodes.filter(n => !n.id.startsWith("box-"));

      // Step A: Find all unique logic conditions
      const uniqueLogicTracks = new Set<string>();
      pathableNodes.forEach(n => {
        if (n.data?.isBranchingLogic && n.data?.logicText) {
          uniqueLogicTracks.add(n.data.logicText);
        }
        // We still register term logic so we know a distinct conditional exit exists
        if (n.id.startsWith("TERM-") && n.data?.logicText) {
          uniqueLogicTracks.add(n.data.logicText);
        }
      });

      const linearPaths: string[][] = [];

      // Step B: Build the Base Spine
      const baseSpine: string[] = [];
      for (const node of pathableNodes) {
        if (node.id.startsWith("TERM-")) {
          // If a node terminates unconditionally, the main survey spine physically ends here!
          if (!node.data?.logicText && baseSpine.includes(node.id.replace("TERM-", ""))) {
            break; 
          }
        } else if (!node.data?.isBranchingLogic) {
          baseSpine.push(node.id);
        }
      }
      linearPaths.push(baseSpine);

      // Step C: Build Tracks
      Array.from(uniqueLogicTracks).forEach(trackLogic => {
        const trackPath: string[] = [];
        
        for (const node of pathableNodes) {
          if (node.id.startsWith("TERM-")) {
            const parentId = node.id.replace("TERM-", "");
            const isUnconditionalTerm = !node.data?.logicText;
            const isTrackTerm = node.data?.logicText === trackLogic;

            // Stop the path from continuing if it hits a termination!
            if (isTrackTerm || (isUnconditionalTerm && trackPath.includes(parentId))) {
              if (!trackPath.includes(parentId)) trackPath.push(parentId);
              break; // The path ends here.
            }
          } else {
            if (!node.data?.isBranchingLogic || node.data?.logicText === trackLogic) {
              trackPath.push(node.id);
            }
          }
        }
        linearPaths.push(trackPath);
      });

      // Step D: Final Deduplication & SCRUBBING
      const finalPathsMap = new Map<string, string[]>();
      linearPaths.forEach(path => {
        // Strip out the "TERM-" node IDs from the final arrays.
        const cleanPath = path.filter(p => !p.startsWith("TERM-"));
        
        const signature = cleanPath.join("->");
        if (signature && !finalPathsMap.has(signature)) {
          finalPathsMap.set(signature, cleanPath);
        }
      });

      let deduplicatedPaths = Array.from(finalPathsMap.values());

      // THE FIX: Sweep away short "stub" paths (early terminations) so they don't get buttons!
      deduplicatedPaths = deduplicatedPaths.filter((currentPath, index, array) => {
         const currentStr = currentPath.join("->");
         
         const isSubset = array.some((otherPath, otherIndex) => {
            if (index === otherIndex) return false;
            const otherStr = otherPath.join("->");
            // If the current path is entirely contained within another longer path, it's a subset
            return otherStr.includes(currentStr) && otherStr.length > currentStr.length;
         });
         
         return !isSubset; 
      });

      set({ nodes, edges, paths: deduplicatedPaths });
    },
  }))
);
