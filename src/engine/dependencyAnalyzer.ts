import {
  Question,
  QuestionLogic,
  LogicNode,
} from "../types/logic";

/**
 * Extracts all parent question IDs from a logic node tree
 */
export function extractAllParentIds(
  node: LogicNode | null | undefined,
  ids = new Set<string>()
): string[] {
  if (!node) return [];
  if (node.type === "leaf" && node.questionId) {
    ids.add(node.questionId.toString());
  } else if (node.type === "branch" && node.children) {
    node.children.forEach((child) => extractAllParentIds(child, ids));
  }
  return Array.from(ids);
}

/**
 * Maps parent-child relationships and identifies long-distance dependencies
 */
export function analyzeDependencies(
  refinedQuestions: Question[],
  logicMap: Record<string, QuestionLogic>
) {
  const branchChildrenMap: Record<string, string[]> = {};
  const branchChildSet = new Set<string>();
  const longDistanceDependencies: { source: string; target: string }[] = [];

  refinedQuestions.forEach((currentQuestion, currentIndex) => {
    const questionId = currentQuestion.id.toString();
    const allParentIds = extractAllParentIds(logicMap[questionId]?.show);

    if (allParentIds.length > 0) {
      const parentInformationList = allParentIds
        .map((parentId) => ({
          id: parentId,
          index: refinedQuestions.findIndex(
            (question) => question.id.toString() === parentId
          ),
        }))
        .filter((parentInfo) => parentInfo.index !== -1)
        .sort((a, b) => b.index - a.index);

      if (parentInformationList.length > 0) {
        const primaryParent = parentInformationList[0];
        let hasUnconditionalQuestionBetween = false;

        for (let i = primaryParent.index + 1; i < currentIndex; i++) {
          const middleQuestionId = refinedQuestions[i].id.toString();
          const middleQuestionParents = extractAllParentIds(
            logicMap[middleQuestionId]?.show
          );

          if (middleQuestionParents.length === 0) {
            hasUnconditionalQuestionBetween = true;
            break;
          }
        }

        if (hasUnconditionalQuestionBetween) {
          longDistanceDependencies.push({
            source: primaryParent.id,
            target: questionId,
          });
        } else {
          if (!branchChildrenMap[primaryParent.id])
            branchChildrenMap[primaryParent.id] = [];
          branchChildrenMap[primaryParent.id].push(questionId);
          branchChildSet.add(questionId);
        }

        for (let i = 1; i < parentInformationList.length; i++) {
          longDistanceDependencies.push({
            source: parentInformationList[i].id,
            target: questionId,
          });
        }
      }
    }
  });

  return { branchChildrenMap, branchChildSet, longDistanceDependencies };
}