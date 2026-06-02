# Function Import Report

## Imported functions

- `parseSurveyData` — `src/engine/surveyParser.ts`
  - imported in `src/store/useSurveyStore.ts`
- `useSurveyStore` — `src/store/useSurveyStore.ts`
  - imported in `src/App.tsx`, `src/components/LogicMap/index.tsx`, `src/components/LogicSidebar/index.tsx`, `src/components/LogicMap/PathSelector.tsx`
- `App` (default export) — `src/App.tsx`
  - imported in `src/main.tsx`
- `resolveEffectiveLogic` — `src/utils/logicHelpers.ts`
  - imported in `src/store/useSurveyStore.ts`
- `readableCondition` — `src/utils/logicHelpers.ts`
  - imported in `src/store/useSurveyStore.ts`
- `calculateAllPaths` — `src/engine/graphBuilder.ts`
  - imported in `src/store/useSurveyStore.ts`
- `buildGraphLevelLayout` — `src/engine/graphBuilder.ts`
  - imported in `src/store/useSurveyStore.ts`
- `ConvertedQuestionsView` (default export) — `src/components/ConvertedQuestionsView/index.tsx`
  - imported in `src/App.tsx`
- `LogicMap` (default export) — `src/components/LogicMap/index.tsx`
  - imported in `src/App.tsx`
- `PathSelector` (default export) — `src/components/LogicMap/PathSelector.tsx`
  - imported in `src/components/LogicMap/index.tsx`
- `QuestionNode` (default export) — `src/components/LogicMap/QuestionNode.tsx`
  - imported in `src/components/LogicMap/index.tsx`
- `NodeEditor` (default export) — `src/components/LogicSidebar/NodeEditor.tsx`
  - imported in `src/components/LogicSidebar/BranchEditor.tsx`, `src/components/LogicSidebar/index.tsx`
- `BranchEditor` (default export) — `src/components/LogicSidebar/BranchEditor.tsx`
  - imported in `src/components/LogicSidebar/NodeEditor.tsx`
- `LeafEditor` (default export) — `src/components/LogicSidebar/LeafEditor.tsx`
  - imported in `src/components/LogicSidebar/NodeEditor.tsx`
- `evaluate` — `src/engine/evaluator.ts`
  - imported in `src/engine/surveyRunner.ts`

## Functions not imported anywhere

- `shouldShow` — `src/engine/surveyRunner.ts`
- `shouldTerminate` — `src/engine/surveyRunner.ts`
- `getVisibleSurvey` — `src/engine/surveyRunner.ts`
- `LogicSidebar` (default export) — `src/components/LogicSidebar/index.tsx`

## Notes

- `src/engine/surveyRunner.ts` is not referenced/imported by any other source file in the repository.
- `evaluate` is imported only from `src/engine/surveyRunner.ts`, so its usage is currently contained within an unused module.
- This report is based on static import references in `src/**/*.{ts,tsx}`.
