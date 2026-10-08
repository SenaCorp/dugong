# Visual editing implementation plan

> **For agentic workers:** Use superpowers:executing-plans, native execution in this session. User approved all steps; no further confirmation gates.

**Goal:** Editable canvas synchronized with Mermaid-like source, movable nodes, clean routes and undo/redo across supported diagram modes.

**Architecture:** Keep parser/model/layout independent. Add pure source mutation, document history and manual-position/routing utilities. A small visual editing controller exposes callbacks to the existing preview and renderer.

**Tech Stack:** Existing React, TypeScript, React Flow, ELK, Vitest.

**Spec:** ../specs/2026-10-08-visual-editing-design.md

## Global constraints
- No new dependencies or backend; source is the only persisted document.
- Preserve comments, IDs, styling, groups and existing hover/playback/export behavior.
- ELK for Auto layout; session offsets for manual movement; sequence horizontal only.

## Review focus
- Quoted delimiters and duplicate declarations: patch the effective declaration safely.
- Parallel/multi-node edges: identify exact edge or reject ambiguous edits.
- Dragged nodes/group children: use absolute obstacle bounds and parent-relative positions.
- Async source layout: prevent stale layout/history from replacing newer work.
- Keyboard text editing: never steal Undo from Monaco/input fields.

## Tasks
- [x] 1. Add focused source mutation tests, then implement `editSource.ts` for flowchart node/edge wording, shape/color and new connections.
- [x] 2. Add history tests, then implement session document history with grouped drag commits and undo/redo integration.
- [x] 3. Add obstacle-routing/offset tests, then implement manual layout transforms preserving ports and edge labels; sequence horizontal offsets follow decorations.
- [x] 4. Connect drag, selection, inline wording, shape/color toolbar and connection handles to canvas; Auto layout controls and editing status.
- [x] 5. Extend source mutation tests and editing to C4 labels, ER aliases, sequence participants/messages/notes; reject ambiguous unsupported edits explicitly.
- [x] 6. Verify all tests, lint and build; document gestures, shortcut behavior, session positions and genuine limitations.


## Execution ledger

- Source patches: effective flow node definitions retain classes/comments; explicit token spans retain classic arrow markers; ambiguous expanded edges reject without modification. C4 argument scanning preserves inline comments. ER aliases retain IDs/attributes. Sequence patches accept activation whitespace and preserve implicit participant order.
- History: source + absolute manual positions share bounded snapshots (100); typing coalesces over 750ms; monotonic document versions invalidate wording and drag/connection sessions across undo/reset/source changes.
- Layout: ELK runs for automatic layout. Manual coordinates are absolute pins; nested groups resize around children; affected/obstructed edges use obstacle routing with bend/shared-route penalties. Overlap or impossible routing rejects the move.
- Sequence: participant order and >=20px card gaps are preserved; lifelines, activation bars, notes, frames and boxes follow horizontal movement. Spanning notes retain sufficient original width to avoid overflow; frames expand to contain notes/self-call labels.
- Review: independent read-only review found six source/session issues plus two sequence/drag issues; all were addressed with focused regressions/static review.
- Ruling: no git/worktree/commit steps because this workspace is not a Git repository. User approved native execution and all plan steps; no repeated approval prompts.
- Ruling: positions are session-only absolute pins rather than offsets, so source wording changes cannot shift a manually positioned node by changing ELK's base position. localStorage still saves only source.

## Final verification

- `npm test`: 38 files, 201 tests passed.
- `npm run lint`: passed, exit 0.
- `npm run build`: passed, exit 0. Existing environment warnings: Node 22.7 below Vite's supported version and large editor/application chunks.
- Browser interaction/download checks were not available in this session; no direct browser verification is claimed.
- Remaining documented boundaries: positions/history are session-only; ambiguous expanded edge edits require splitting source lines; metadata/group/attribute editing stays in source. Invalid/overlapping manual placements reject or require Auto layout.
