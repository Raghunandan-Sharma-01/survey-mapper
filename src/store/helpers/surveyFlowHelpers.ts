import { Question, QuestionLogic, SurveyBlock, BlockType, ConvertedQuestion } from "../../types/logic";
import { parseTextToLogicNode } from "../../utils/htmlParsing/logicParser";
import { resolveEffectiveLogic } from "../../utils/logicHelpers";

export type SourceQuestion = Question | ConvertedQuestion;
export type ProcessedQuestion = SourceQuestion & { parentBlocks: string[] };

const getShowText = (q: SourceQuestion | undefined): string | null =>
  q && "showLogic" in q ? q.showLogic?.text ?? null : null;

const getTerminateText = (q: SourceQuestion | undefined): string | null =>
  q && "terminateLogic" in q ? q.terminateLogic?.text ?? null : null;

export function buildSourceQuestions(
  sourceQuestions: SourceQuestion[],
  blocks: Record<string, SurveyBlock>
) {
  const dynamicBlocks: Record<string, SurveyBlock> = { ...blocks };
  const activeBlocks: SurveyBlock[] = [];
  const processedQuestions: ProcessedQuestion[] = [];
  let blockCounter = 1;

  for (const q of sourceQuestions) {
    const name = (q.name || "").trim();
    const text = (q.text || "").trim();
    const isMarker = q.type === "Structural Marker";

    if (isMarker) {
      const lowerText = text.toLowerCase();
      let type: BlockType = "Section";

      if (lowerText.includes("loop")) type = "Loop";
      else if (lowerText.includes("subsection")) type = "Subsection";
      else if (lowerText.includes("page")) type = "Page";

      if (lowerText.includes("start")) {
        const cleanName = text
          .replace(/^(loop|subsection|section|page)\s*start\s*-?\s*/i, "")
          .trim() || type;
        const blockId = `block_${type.toLowerCase()}_${blockCounter++}`;

        dynamicBlocks[blockId] = {
          id: blockId,
          type,
          name: cleanName,
          logicText: getShowText(q) || "",
          firstQuestionId: null,
          lastQuestionId: null,
        };
        activeBlocks.push(dynamicBlocks[blockId]);
      } else if (lowerText.includes("end")) {
        for (let i = activeBlocks.length - 1; i >= 0; i--) {
          if (activeBlocks[i].type === type) {
            activeBlocks.splice(i, 1);
            break;
          }
        }
      }
      continue;
    }

    const currentLoop = activeBlocks.find((b) => b.type === "Loop");
    if (currentLoop && name === currentLoop.name) {
      const showText = getShowText(q);
      if (showText) {
        const existingLogic = dynamicBlocks[currentLoop.id].logicText;
        dynamicBlocks[currentLoop.id].logicText = existingLogic
          ? `${existingLogic}\n${showText}`
          : showText;
      }
      continue;
    }

    processedQuestions.push({
      ...q,
      parentBlocks: activeBlocks.map((b) => b.id),
    });
  }

  return { dynamicBlocks, processedQuestions };
}

export function adaptQuestions(processedQuestions: ProcessedQuestion[]): Question[] {
  return processedQuestions.map((q): Question => ({
    id: q.id.toString(),
    uniqueKey: q.id.toString(),
    name: q.name || q.id.toString(),
    fullName: q.name || q.id.toString(),
    text: q.text ?? null,
    type: q.type,
    parentBlocks: q.parentBlocks,
    sectionName: q.parentBlocks[0] || "",
    rows: [],
    columns: [],
    listOrder: 0,
  }));
}

export function resolveLogicMap(
  mappedQuestions: Question[],
  processedQuestions: ProcessedQuestion[],
  logicMap: Record<string, QuestionLogic>
): Record<string, QuestionLogic> {
  const resolvedLogicMap: Record<string, QuestionLogic> = {};

  mappedQuestions.forEach((question) => {
    const convertedQ = processedQuestions.find(
      (c) => c.id.toString() === question.id
    );
    const showText = getShowText(convertedQ);
    const terminateText = getTerminateText(convertedQ);

    if (convertedQ && (showText || terminateText)) {
      resolvedLogicMap[question.id] = {
        show: parseTextToLogicNode(showText),
        terminate: parseTextToLogicNode(terminateText),
        rawShowText: showText,
        rawTerminateText: terminateText,
      };
    } else {
      resolvedLogicMap[question.id] = resolveEffectiveLogic(
        question.id.toString(),
        mappedQuestions,
        logicMap
      );
    }
  });

  return resolvedLogicMap;
}
