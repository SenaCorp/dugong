# Mermaid Markdown Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users upload Markdown files containing Mermaid and view every diagram type supported by Mermaid in Flowlab's pannable, zoomable canvas.

**Architecture:** Use Mermaid.js in the browser to extract, validate, and render the first Mermaid fence, falling back to a full bare Mermaid source document with optional frontmatter. Keep React Flow as the viewport and display Mermaid's SVG as one isolated diagram image in it. Preserve the bundled `diagram.md` as the initial example and replace the current diagram only after a successful render.

**Tech Stack:** React 19, TypeScript, Vite, `@xyflow/react`, Mermaid.js.

**Spec:** `docs/superpowers/specs/2026-10-07-mermaid-markdown-upload-design.md`

## Global Constraints

- Read the file locally in the browser; no server or remote upload is introduced.
- Support one Mermaid block per file in v1; use the first block when there are several.
- Accept Markdown files only. A missing or malformed Mermaid source produces an inline error.
- Use Mermaid's parser/render API, honor frontmatter layout configuration in the source, normalize diagram colors to Flowlab's visual theme, and use strict security mode for diagram rendering.
- Display rendered SVG as an image/isolated SVG resource rather than injecting raw Markdown or source text into the application DOM.
- Revoke any generated object URL when it is replaced or the viewer unmounts.

## Review Focus

- Missing Mermaid diagram: show an inline error and preserve the last valid diagram; manually verify with a prose-only Markdown file. Also verify bare Mermaid source with frontmatter renders as in `diagram.md`.
- Invalid Mermaid syntax: show an inline error and preserve the last valid diagram; manually verify by uploading a malformed flowchart after a valid one.
- Multiple Mermaid fences: render the first one; manually verify with two different diagram types in one Markdown file.
- Mermaid frontmatter configuration: honor `diagram.md` layout and theme; manually verify the bundled initial example and an uploaded file with frontmatter.
- Non-Markdown file: reject it with clear feedback without replacing the current diagram; manually try a `.txt` file.

---

### Task 1: Add browser-side Mermaid document rendering

**Files:**
- Modify: `package.json` and lockfile (add Mermaid runtime dependency)
- Create: `src/mermaid-document.ts`

**Interfaces:**
- Produces: `renderMermaidMarkdown(markdown: string, renderId: string): Promise<{ svg: string; width: number; height: number }>`
- Throws readable errors when neither a Mermaid fence nor valid bare Mermaid source is present, when syntax is invalid, or when SVG dimensions are unusable.

- [x] Add Mermaid.js as a runtime dependency and initialize it in strict security mode with automatic page scanning disabled.
- [x] Implement first-fence extraction for a case-insensitive `mermaid` label with optional label whitespace; pass the complete fenced block body, including Mermaid frontmatter, to Mermaid. When no such fence exists, pass the full document as Mermaid source so bare Mermaid documents with frontmatter render too.
- [x] Implement `renderMermaidMarkdown` using Mermaid parse/render APIs; return the rendered SVG and positive dimensions derived from its `viewBox` with a safe fallback to SVG width/height attributes.
- [ ] Verify the helper against the bundled `diagram.md`, including its config frontmatter, and against a malformed source using a temporary local script or browser console (do not add a test suite in this task).

> Browser-side verification remains pending: the available Node-only Mermaid parse attempt cannot provide the DOM APIs Mermaid's sanitizer expects, and browser automation was unavailable in this session.

### Task 2: Replace the static architecture canvas with the uploadable Mermaid viewer

**Files:**
- Create: `src/MermaidCanvas.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.css`
- Modify: `src/index.css` (retain React Flow styles only where still used)
- Delete: `src/architecture.ts`

**Interfaces:**
- Consumes: `renderMermaidMarkdown` from Task 1.
- `MermaidCanvas` receives `{ imageUrl: string; width: number; height: number; filename: string }` and owns the React Flow viewport and controls. `App` creates and revokes SVG object URLs when a render succeeds, when a diagram is replaced, and on unmount.

- [x] Import `diagram.md` as raw source in `src/App.tsx`; render it on initial load and label it with `diagram.md`.
- [x] Add a file picker and drag/drop target that accept `.md` files; reject other extensions with a visible inline error.
- [x] On each selection, render the file before updating diagram state. Preserve the previous successful SVG on extraction, parse, or render failure; display a readable error and clear it after the next successful render.
- [x] Build `MermaidCanvas` around the existing React Flow pan/zoom surface with one sized diagram image node, minimap, zoom controls, and Frame all action. Set node dimensions from Task 1 and ensure frame all fits wide, tall, and small diagrams.
- [x] Create an SVG Blob URL for the isolated image after successful rendering and revoke it on replacement and unmount. Do not put user-authored Markdown/source into application HTML.
- [x] Replace fixed architecture headings, component/connection counts, and edge legend with tool-oriented copy and the current filename; preserve the existing visual style and responsive laptop/mobile layout.
- [x] Remove obsolete architecture node/edge components and styles; keep the canvas container with explicit width and height so React Flow measures it correctly.
- [ ] Manually verify initial `diagram.md`, upload both a flowchart and a non-flowchart type such as a sequence diagram, each Review Focus case, panning, zooming, frame all, and mobile layout.

> Browser interaction and responsive layout checks remain pending; see the execution ledger for the environment limitation.

### Task 3: Document the public upload behavior and run project checks

**Files:**
- Modify: `README.md`
- Modify: `index.html`

- [x] Update the README with accepted `.md` input, first Mermaid fence behavior, browser-local rendering, and supported Mermaid diagram types; update the page title and description.
- [x] Run `npm run lint`; expected: exit code 0.
- [x] Run `npm run build`; expected: exit code 0 and a production bundle is generated.
