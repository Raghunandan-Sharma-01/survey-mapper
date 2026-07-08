# Survey Mapper

Survey Mapper turns a survey questionnaire into an interactive logic map. Upload a
survey definition and it parses the questions, blocks (sections, subsections,
pages, loops) and show/terminate logic, then renders a graph of the survey flow
with selectable paths. It also includes a QA rules checklist viewer.

## Inputs

Two upload formats are supported (see `src/utils/fileHandling`):

- **JSON** – either raw survey data (`{ sections: [...] }` or an array of
  elements) or the "converted question" format produced from a document.
- **DOCX** – Word questionnaires, converted to HTML via `mammoth` and parsed
  into questions (`src/utils/parseHtmlToQuestions.ts`).

## Tech stack

React 19 + TypeScript, Vite, Zustand (state), ReactFlow (graph), Tailwind CSS.

## Getting started

```bash
npm install
npm run dev        # start the dev server
```

## Scripts

- `npm run dev` – Vite dev server with HMR
- `npm run build` – type-check (`tsc -b`) then build for production
- `npm run typecheck` – type-check only
- `npm run lint` – ESLint (TypeScript-aware)
- `npm run preview` – preview the production build
- `npm run deploy` – build and publish `dist/` to GitHub Pages

## Project structure

- `src/engine` – graph building, layout and path calculation
- `src/utils` – file handling, HTML/text parsing, logic helpers
- `src/store` – Zustand store (`useSurveyStore`)
- `src/components` – UI (header, logic map, sidebars, QA rules viewer)
- `src/types` – shared TypeScript types

## Code Structure & Component Map

The diagram below shows the main folders, top-level components and key utilities.

```mermaid
graph TD
  App[App.tsx]
  subgraph Components
    AH[AppHeader]\n(HeaderUploadSection, HeaderNavigationButtons)
    LM[LogicMap]\n(index.tsx, QuestionNode, TerminateNode, PathSelector)
    CQ[ConvertedQuestionsView]
    QS[QuestionnaireStructure]\n(QuestionnaireSidebar, QuestionItemRenderer)
    CL[Checklist]\n(QARulesViewer, QARulesContent)
  end

  subgraph Store
    US[useSurveyStore]
  end

  subgraph Engine
    GB[graphBuilder]
    LAYOUT[getLayoutedGraph & layout/*]
    PARSER[surveyParser]
  end

  subgraph Utils
    DOC[docConverter]
    PARSE[parseHtmlToQuestions]
    CLEAN[cleanAndMergeQuestions]
    LOGIC[logicHelpers]
    SAN[ sanitizeHtml ]
    FILE[fileHandling/uploadHandler]
  end

  subgraph Types
    T[types/*]
  end

  App --> AH
  App --> US
  App --> CL
  App --> CQ
  App --> QS
  App --> LM

  LM --> GB
  GB --> LAYOUT
  GB --> PARSER

  US --> PARSER
  US --> DOC
  US --> CLEAN

  DOC --> PARSE
  PARSE --> LOGIC

  LM --> FILE
  CL --> SAN
  AH --> FILE
  App --> T

``` 

**Short descriptions**

- **`src/components`**: React UI. Key pieces:
  - **`AppHeader`**: file upload + view controls (`HeaderUploadSection`, `HeaderNavigationButtons`).
  - **`LogicMap`**: main interactive graph view rendered with React Flow. Nodes are `QuestionNode` and `TerminateNode`; `PathSelector` chooses precomputed paths.
  - **`QuestionnaireStructure`**: sidebar list of converted/refined questions and a renderer for each question.
  - **`ConvertedQuestionsView`**: shows parsed questions from DOCX/JSON for review.
  - **`Checklist`**: QA rules viewer and content used to inspect rules and issues.

- **`src/store/useSurveyStore.ts`**: central Zustand store holding refined/converted questions, `logicMap`, `nodes/edges`, paths and mutations used across the UI.

- **`src/engine`**: builds the graph model consumed by `LogicMap`:
  - `graphBuilder.ts` — orchestrates building nodes/edges using layout utilities.
  - `layout/*` — contains layout pipeline (preparation, bounding boxes, grid assignment, routing of logic edges).
  - `parser/surveyParser.ts` — converts raw survey JSON structure into `Question` and `SurveyBlock` models.

- **`src/utils`**: parsing and transform helpers:
  - `docConverter.ts`, `parseHtmlToQuestions.ts` — convert DOCX -> HTML -> converted questions.
  - `cleanAndMergeQuestions.ts`, `textCleaning/*` — dedupe, clean question text and strip instructions.
  - `htmlParsing/*` — low-level HTML element processors and logic extractor/parser.
  - `logicHelpers.ts` — helpers to inspect/normalize logic expressions.
  - `fileHandling/uploadHandler.ts` — file upload flow and callbacks.

- **`src/types`**: TypeScript definitions for questions, logic nodes, blocks and store state.

If you'd like, I can also generate a PNG/SVG of the Mermaid diagram and add it to the repo, or expand this map with more file-level detail.
