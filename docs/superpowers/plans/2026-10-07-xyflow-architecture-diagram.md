# React Flow Architecture Diagram Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the starter page with a polished, navigable React Flow rendering of `diagram.md`.

**Architecture:** Keep the graph's typed node and edge data in `src/architecture.ts`. Render domain group cards and system nodes as React Flow custom node types from `src/App.tsx`; keep the canvas and responsive visual system in `src/App.css` and `src/index.css`.

**Tech Stack:** React 19, TypeScript, Vite, `@xyflow/react`.

**Spec:** `docs/superpowers/specs/2026-10-07-xyflow-architecture-diagram-design.md`

## Global Constraints

- `diagram.md` remains authoritative for names, group membership, connection directions, and edge labels.
- The `RE` connection from services resolves to the Rule Engine inside the RE group.
- Do not add dependencies beyond `@xyflow/react`.
- Do not add editing, persistence, search, or Mermaid parsing.

## Review Focus

- Cross-domain edges must remain visible and terminate on the intended component; the architecture graph definition and manual canvas review cover this.
- Shared destinations must receive edges from each source listed; the architecture graph definition and manual canvas review cover this.
- The `Private` label must be readable on the three private service integration paths; the custom edge and manual canvas review cover this.
- Long domain or component labels must remain legible at narrow widths; responsive CSS and manual narrow viewport review cover this.
- Initial framing must include the whole graph without blocking pan and zoom; React Flow `fitView` and manual canvas review cover this.

---

### Task 1: Build and style the architecture canvas

**Files:**
- Create: `src/architecture.ts` — typed React Flow node and edge data for each domain and component in `diagram.md`.
- Modify: `src/App.tsx` — custom domain, system, and labeled-edge renderers; React Flow canvas, heading, controls, minimap, and initial fit.
- Modify: `src/App.css` — canvas layout and custom node/edge styles.
- Modify: `src/index.css` — global typography, color tokens, and full-viewport responsive sizing.

**Interfaces:**
- `architecture.ts` exports `architectureNodes: Node[]` and `architectureEdges: Edge[]` (using explicit React Flow generics or a shared typed data model).
- `App.tsx` consumes those arrays and exports the default app component.

- [x] Define the domain groups, named components, directed edges, and `Private` labels in `src/architecture.ts`, preserving all connections in `diagram.md`.
- [x] Render the groups and components with reusable custom React Flow node renderers and labeled directed edges in `src/App.tsx`.
- [x] Replace starter styles with the dark technical visual treatment, clear category accents, and a full-height responsive canvas in `src/App.css` and `src/index.css`.
- [ ] Run `npm run build` with Node 22.22.3 and resolve TypeScript or build errors.
- [ ] Manually review the graph at desktop and narrow viewport widths for all groups, edges, labels, controls, minimap, fit framing, and pan/zoom usability.

## Execution Notes

- `npm run lint` passes.
- `npm run build` succeeds with the system x64 Node 22.7.0 and emits the architecture labels; Vite warns that this Node version is below its supported floor (22.12.0).
- The installed Node 22.22.3 is arm64, while `node_modules` currently contains only the x64 Rolldown binding. Running with Node 22.22.3 therefore fails before Vite starts.
- User runtime console confirmed the React Flow parent had no measurable dimensions. The canvas used percentage height under an auto-height section; it now receives an explicit viewport-based height, and React Flow itself is explicitly 100% wide and high.
- The user reports a laptop viewport. Desktop still frames the entire graph; narrow screens start focused on the gateway/services cluster and retain the Frame all control.
- The dev server cannot bind a local port in this execution environment (`listen EPERM`), so a direct browser visual check remains unavailable here.
