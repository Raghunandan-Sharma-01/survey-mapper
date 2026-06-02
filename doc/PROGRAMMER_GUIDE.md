# Survey Mapper - Programmer's Technical Guide

## Project Overview

**Survey Mapper** is a React + Vite application that provides a visual interface for designing complex survey logic. It allows users to upload survey data, define conditional branching rules, and visualize the flow of questions based on user responses.

**Tech Stack:**
- Frontend: React 19 + TypeScript
- Build Tool: Vite
- State Management: Zustand
- Graph Visualization: ReactFlow
- Styling: Tailwind CSS

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     App.tsx (Main)                      │
│                   Upload & View Toggle                  │
└────────────┬──────────────────────────────────┬─────────┘
             │                                  │
      ┌──────▼──────┐                    ┌─────▼──────┐
      │   Editor    │                    │  Logic Map │
      │   View      │                    │   View     │
      │             │                    │            │
      │ Sidebar +   │                    │ ReactFlow  │
      │ Node Editor │                    │ Graph      │
      └──────┬──────┘                    └─────▬──────┘
             │                                 │
             └────────────┬────────────────────┘
                          │
              ┌───────────▼───────────┐
              │  Zustand Store        │
              │  (useSurveyStore)     │
              │                       │
              │ - Survey Data         │
              │ - Logic Map           │
              │ - Nodes/Edges         │
              │ - Active Path         │
              └───────────┬───────────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
      ┌───▼────┐     ┌───▼────┐    ┌────▼────┐
      │ Parser │     │ Engine │    │  Utils  │
      │        │     │        │    │         │
      │Survey  │     │Evaluator
      │Parser  │     │GraphBld │    │Helpers  │
      └────────┘     │Surveyor │    │         │
                     └────────┘    └────────┘
```

---

## Folder Structure & Components

### `src/types/logic.ts` - Type Definitions
Defines the core data structures:

**Key Types:**
```typescript
LogicalOperator       // AND, OR
ComparisonOperator   // SELECTED, NOT_SELECTED, GT, LT, etc.
SurveyBlock         // Page, Section, Subsection, Loop
Question            // Survey question metadata
LogicNode           // LogicBranch or LogicLeaf
QuestionLogic       // { show: LogicNode, terminate: LogicNode }
```

**Operators:**
- **Logical:** AND (all conditions met), OR (any condition met)
- **Comparison:** SELECTED, NOT_SELECTED, GT, LT, GTE, LTE, IN, ALL

### `src/store/useSurveyStore.ts` - State Management
Zustand store managing application state:

**Key State:**
- `data` - Raw uploaded survey JSON
- `refinedQuestions` - Parsed questions
- `logicMap` - Question ID → Logic rules mapping
- `nodes`, `edges` - ReactFlow graph elements
- `paths` - Pre-calculated survey paths
- `currentView` - "editor" or "map" mode

**Key Actions:**
- `setSurveyData(data)` - Parses uploaded JSON and builds graph
- `updateLogic(id, logic)` - Updates conditional logic for a question
- `setActivePath(index)` - Highlights a specific survey path
- `getFlowElements()` - Generates ReactFlow nodes/edges

### `src/engine/` - Core Logic Engine

#### **surveyParser.ts**
Converts raw survey JSON into structured data:
```
JSON → Extract Questions → Extract Blocks → Build Logic Map
```

#### **graphBuilder.ts**
Creates the visual graph representation:
- `buildGraphLevelLayout()` - Positions nodes with hierarchical layout
- `calculateAllPaths()` - Generates all possible survey paths based on logic
- Creates nodes for questions and edges for skip/branch logic

#### **evaluator.ts**
Evaluates conditional logic against user responses:
```
LogicNode + Answers → Boolean (show/hide/terminate?)
```

**Examples:**
- `{ operator: AND, children: [cond1, cond2] }` → true if all children true
- `{ value: q1, operator: SELECTED, operand: ["Yes"] }` → true if q1 answered "Yes"

#### **surveyRunner.ts**
Runtime logic for executing surveys:
- `shouldShow(questionId, logicMap, answers)` - Determines visibility
- `shouldTerminate(questionId, logicMap, answers)` - Checks end conditions

### `src/components/` - UI Components

#### **LogicMap/** (Graph Visualization)
- `index.tsx` - Main ReactFlow canvas displaying question flow
- `QuestionNode.tsx` - Renders individual question nodes
- `PathSelector.tsx` - Filters displayed paths

#### **LogicSidebar/** (Editor Controls)
- `index.tsx` - Main sidebar container
- `NodeEditor.tsx` - Generic logic condition builder
- `BranchEditor.tsx` - Manages skip/branch logic
- `LeafEditor.tsx` - Edits individual conditions

### `src/utils/logicHelpers.ts`
Helper functions:
- `readableCondition()` - Converts logic AST to human-readable text
- `resolveEffectiveLogic()` - Determines effective logic considering inheritance

---

## Data Flow

### 1. **Upload Survey**
```
User Upload (JSON)
    ↓
handleFileUpload() in App.tsx
    ↓
setSurveyData() in Store
    ↓
parseSurveyData() - Extract questions & blocks
    ↓
buildGraphLevelLayout() - Position nodes
    ↓
State Updated: nodes, edges, logicMap, paths
```

### 2. **Edit Logic**
```
User clicks node in Sidebar
    ↓
NodeEditor/BranchEditor opens
    ↓
User defines condition (IF → THEN)
    ↓
updateLogic(questionId, newLogic)
    ↓
Store recalculates paths & graph
    ↓
LogicMap updates visualization
```

### 3. **Evaluate Survey Path**
```
User selects a specific path (or "All Paths")
    ↓
setActivePath(index) filters nodes/edges
    ↓
ReactFlow highlights path
    ↓
Highlighted path shows: Q1 → Q3 → Q5 (based on logic)
```

### 4. **Runtime Execution**
```
Survey Answer: "q1 = Yes"
    ↓
shouldShow(q2, logicMap, answers)
    ↓
Evaluator traverses Logic AST
    ↓
Returns: true (show Q2) or false (skip Q2)
    ↓
Next question determined
```

---

## Logic Structure (AST)

Survey logic is represented as an Abstract Syntax Tree:

```typescript
// Example: Show Q2 if (Q1 = "Yes" AND Q3 ≠ "No") OR (Q5 > 50)

{
  show: {
    operator: OR,
    children: [
      {
        operator: AND,
        children: [
          { value: "q1", operator: SELECTED, operand: ["Yes"] },
          { value: "q3", operator: NOT_SELECTED, operand: ["No"] }
        ]
      },
      { value: "q5", operator: GT, operand: 50 }
    ]
  },
  terminate: null  // Don't end survey at this question
}
```

---

## Key File Connections

```
App.tsx
  ├─ imports useSurveyStore
  │   ├─ calls parseSurveyData() from engine/surveyParser.ts
  │   ├─ calls buildGraphLevelLayout() from engine/graphBuilder.ts
  │   └─ stores state: refinedQuestions, logicMap, nodes, edges
  │
  ├─ renders LogicSidebar
  │   ├─ NodeEditor (edits logic)
  │   │   └─ calls updateLogic() → triggers store recalculation
  │   └─ LeafEditor, BranchEditor (condition builders)
  │
  └─ renders LogicMap
      └─ QuestionNode components
          ├─ Display question & connections
          └─ Listen to store changes
```

---

## How Logic Evaluation Works

**Example Scenario:**

Survey has:
- Q1: "Are you interested?" (Yes/No)
- Q2: "Describe interest" (text)
- Q3: "How many years?" (number)

Logic defined:
- Q2 shows IF Q1 = "Yes"
- Q3 shows IF Q2 is not empty AND Q1 ≠ "No"

**Execution:**

1. User answers Q1 = "Yes"
2. `shouldShow("Q2", logicMap, {Q1: "Yes"})`
3. Evaluator checks: `Q1 == "Yes"` → TRUE
4. Q2 is displayed

5. User enters text in Q2
6. `shouldShow("Q3", logicMap, {Q1: "Yes", Q2: "text"})`
7. Evaluator checks AND of two conditions:
   - `Q2 not empty` → TRUE
   - `Q1 ≠ "No"` → TRUE (Q1 is "Yes")
8. Q3 is displayed

---

## State Management Flow

**Zustand Store Pattern:**
```typescript
export const useSurveyStore = create<SurveyStore>()(
  devtools((set, get) => ({
    // State
    refinedQuestions: [],
    logicMap: {},
    nodes: [],
    
    // Actions
    setSurveyData: (data) => set(() => {
      const questions = parseSurveyData(data);
      const { nodes, edges } = buildGraphLevelLayout(questions);
      return { refinedQuestions: questions, nodes, edges };
    }),
    
    updateLogic: (id, logic) => set((state) => {
      const newLogicMap = { ...state.logicMap, [id]: logic };
      return { logicMap: newLogicMap };
    })
  }))
);
```

---

## Development Workflow

### Adding a New Feature

**Example: Add "Hidden" operator**

1. **Update types** (`src/types/logic.ts`):
   ```typescript
   enum ComparisonOperator {
     HIDDEN = "HIDDEN",  // New
   }
   ```

2. **Update evaluator** (`src/engine/evaluator.ts`):
   ```typescript
   case "HIDDEN":
     return !answers[node.value];
   ```

3. **Update UI component** (`src/components/LogicSidebar/NodeEditor.tsx`):
   ```tsx
   <option value="HIDDEN">Always Hidden</option>
   ```

4. **Test** via store update

---

## Performance Considerations

- **Path Calculation:** `calculateAllPaths()` runs once on data load
- **Graph Layout:** Hierarchical layout may slow with 100+ questions
- **Evaluation:** O(depth of AST) per condition check
- **Memoization:** Use React.memo for QuestionNode to prevent re-renders

---

## Common Debugging Tips

1. **Check Logic Map:** `console.log(useSurveyStore((s) => s.logicMap))`
2. **Trace Evaluation:** Add logs in `evaluator.ts`
3. **View ReactFlow:** Inspect `nodes` and `edges` in store
4. **Path Issues:** Check `calculateAllPaths()` output

---

## Identifying Repeated Questions Across Paths

One of the core features is helping users identify and optimize repeated questions across different survey paths. Here's how it works technically:

### Algorithm: Finding Duplicate Questions in Paths

```typescript
// Function to identify questions appearing in multiple paths
function findRepeatedQuestions(paths: string[][], refinedQuestions: Question[]) {
  const questionFrequency: Record<string, number> = {};
  
  // Count occurrences of each question across all paths
  paths.forEach(path => {
    const uniqueInPath = new Set(path);
    uniqueInPath.forEach(questionId => {
      questionFrequency[questionId] = (questionFrequency[questionId] || 0) + 1;
    });
  });
  
  // Find questions appearing in multiple paths
  const repeated = Object.entries(questionFrequency)
    .filter(([_, count]) => count > 1)
    .map(([questionId, count]) => ({
      questionId,
      appearsInPaths: count,
      question: refinedQuestions.find(q => q.uniqueKey === questionId),
      percentage: ((count / paths.length) * 100).toFixed(2)
    }));
  
  return repeated;
}
```

**Example Output:**
```
[
  {
    questionId: "q_email",
    appearsInPaths: 5,
    question: { name: "Email Address", ... },
    percentage: "100"  // Appears in all paths
  },
  {
    questionId: "q_satisfaction",
    appearsInPaths: 4,
    question: { name: "Satisfaction Rating", ... },
    percentage: "80"   // Appears in 80% of paths
  }
]
```

### Data Structure: Path Analysis

The `calculateAllPaths()` function in `graphBuilder.ts` generates all possible paths:

```typescript
// Example output from calculateAllPaths()
paths = [
  ["q1", "q2", "q_email", "q3", "q_thank_you"],      // Path A: Customer
  ["q1", "q2_alt", "q_email", "q_interest", "q_thank_you"], // Path B: Non-customer
  ["q1", "q2_survey", "q_email", "q_feedback"]        // Path C: Survey taker
]

// All paths contain "q_email" and "q_thank_you" → repeated questions
```

### How the UI Highlights This

**In LogicMap.tsx:**
1. Color code nodes based on frequency
2. Nodes appearing in all paths: Green (consolidate to start)
3. Nodes appearing in some paths: Yellow (review placement)
4. Nodes appearing in one path: Blue (unique to that path)

```typescript
// Color logic in QuestionNode.tsx
const getNodeColor = (questionId: string, pathOccurrence: number, totalPaths: number) => {
  const percentage = (pathOccurrence / totalPaths) * 100;
  
  if (percentage === 100) return "#2ecc71";  // Green - all paths
  if (percentage >= 50) return "#f39c12";   // Yellow - most paths
  return "#3498db";                         // Blue - few paths
};
```

### Optimization Workflow for Developers

1. **Analyze Paths:**
   ```typescript
   const repeated = findRepeatedQuestions(paths, refinedQuestions);
   console.table(repeated);
   ```

2. **Identify Consolidation Candidates:**
   ```typescript
   const consolidateCandidates = repeated
     .filter(r => r.percentage > 70)  // Questions in 70%+ of paths
     .map(r => r.questionId);
   ```

3. **Suggest Restructuring:**
   ```typescript
   // If these questions appear in most paths,
   // move them before branching logic
   consolidateCandidates.forEach(qId => {
     console.log(`${qId} appears ${repeated.find(r => r.questionId === qId).percentage}% of paths`);
     console.log("Suggestion: Ask this question before branching");
   });
   ```

### Performance: Detecting Redundancy

When `updateLogic()` is called:
1. Recalculate paths: `calculateAllPaths()`
2. Find repeated questions automatically
3. Highlight them in the UI
4. Display optimization suggestion

```typescript
updateLogic: (id: string, logic: Partial<QuestionLogic>) => set((state) => {
  const newLogicMap = { ...state.logicMap, [id]: logic };
  const newPaths = calculateAllPaths(state.refinedQuestions, newLogicMap);
  const repeated = findRepeatedQuestions(newPaths, state.refinedQuestions);
  
  return { 
    logicMap: newLogicMap,
    paths: newPaths,
    duplicateQuestions: repeated  // Store for UI display
  };
})
```

### Use Case: Survey Optimization Report

```typescript
// Generate a report of optimization opportunities
function generateOptimizationReport(paths: string[][], questions: Question[]) {
  const analysis = {
    totalPaths: paths.length,
    questionsInAllPaths: [],
    questionsInMostPaths: [],
    uniqueToFewPaths: []
  };
  
  const repeated = findRepeatedQuestions(paths, questions);
  
  repeated.forEach(item => {
    if (item.percentage === "100") {
      analysis.questionsInAllPaths.push({
        question: item.question.name,
        recommendation: "Move to start of survey"
      });
    } else if (item.percentage >= "70") {
      analysis.questionsInMostPaths.push({
        question: item.question.name,
        percentage: item.percentage,
        recommendation: "Consider moving earlier or consolidating logic"
      });
    }
  });
  
  return analysis;
}
```

---

## Extension Points

- **Custom Operators:** Add to `ComparisonOperator` and update evaluator
- **New Block Types:** Extend `BlockType` and parser logic
- **Custom Layouts:** Create alternative layout algorithms
- **Export Formats:** Add new export handlers

