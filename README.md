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
