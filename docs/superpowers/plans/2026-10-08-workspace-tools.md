# Workspace tools implementation

Spec: ../specs/2026-10-08-workspace-tools-design.md
Execution: native, approved by user. Existing source patcher/history contracts remain authoritative.

## Tasks
- [x] 1. Browser availability and baseline QA: inspect available tools, use browser if available; otherwise record the block and run relevant renderer tests.
- [x] 2. Element CRUD: extend SourceEdit with add/duplicate/delete. Implement mode-aware small helpers; collision-free IDs, retain parent/metadata, clean connected lines/styles, preserve unrelated implicit nodes. Add focused tests for all four modes, expanded flow statements, CRLF/comments and sequence activations.
- [x] 3. Workspace save: validate version/source/finite positions, guarded storage read/write, initialize history from document, Save action/status, reset/example clearing. Test corrupt storage, mismatched source, reload, failure and history integration.
- [x] 4. Inspector: add semantic source edits for C4 metadata, ER attributes, group names and sequence branch conditions/boxes. Tests prove targeted updates preserve surrounding source and reject bad values. Build compact selected-item forms and connect CRUD controls.
- [x] 5. Verify/document/review: run complete tests/lint/build, document gestures/persistence/limits, request one independent review, fix important issues with regression tests.

## Review focus
- Deleting inline or implicit nodes must not delete unrelated nodes or revive the removed node via a group alias.
- Source edits must preserve CRLF, frontmatter and comments, and must never silently change an unrelated relationship.
- Snapshot positions must not apply to a different source; invalid storage must never crash startup.
- Inspector drafts and actions must not apply after source/undo changes.
- Changed node dimensions must not leave overlapping manual arrangements; undo retains the prior layout.

## Ledger
- Ruling: user approved continuation and requested execution; skill approval handoffs do not add another gate. Native implementation with one final reviewer.
- Ruling: project has no Git repository; use file ledger and keep all verification output references.
- Task 1: browser skill read; no browser, node_repl or discovery tool is exposed. Browser gestures/export remain unverified. Continue with source/layout/renderer automated checks.

- Task 2: complete. Element actions tested across four modes. Additional RED→GREEN regressions: preserve implicit group membership, sequence participant order outside boxes, all C4 comments. Source patcher continues reparsing before commit.
- Task 3: complete. Six storage tests cover save/reload, mismatch, legacy/corrupt snapshots, invalid coordinates, storage failure and reset. History initialization accepts a document; no dependency added.
- Task 4: complete. Seven source inspector tests and four SSR control/header tests passed. Headers are keyboard accessible despite non-interactive frame containers. Inspector key includes both document and successful preview revisions to invalidate drafts during debounce/layout.
- Ruling: structural actions and inspector metadata/attribute/group edits release manual pins so ELK can accommodate changed sizes; undo retains the old arrangement. Cost: arranging again after structural edits.
- Ruling: delete an activation-linked sequence message clears activation annotations for the affected participant, preserving other messages and balanced source. Cost: activation annotations may need recreating for its surviving interactions.

- Final review: independent read-only workspace_review. No Critical findings; four Important and two initially Minor.
- Final: Ruling: ambiguous uncolored sequence box names silently changed wording/color, so regraded Important and now rejected with an actionable error. Cost: rename requires another name or explicit source color.
- Final: fixed dimension-changing wording pins — positionsForSourceEdit growth/undo test RED→GREEN; shared nodeSize extracted without changing layout calculations.
- Final: fixed surviving ER aliases and flow class metadata — deletion/class inheritance tests RED→GREEN; no new direct style overrides for orphans.
- Final: fixed duplicate against nested singleton group aliases — materializes existing endpoints before adding a sibling, RED→GREEN.
- Final: fixed ER attribute field injection — validates each field before serialization, RED→GREEN.
- Final: fixed ambiguous box names — reject uncolored color-leading text; colored boxes retain exact names, RED→GREEN.
- Final: minor (deferred): legacy implicit-node wording insertion can mix LF with CRLF. Syntax/rendering remains valid, but source line endings are not always uniform.
- Final: Ruling: reviewer declined browser gesture/download/visual QA because tools are absent. SSR controls and source/layout tests verify contracts, not actual pointer behavior. Cost: manual browser QA remains outstanding.

- Task 5: complete. README updated. Final fix pass verified independently; no second review dispatched.
- Final verification 2026-10-08: npm test → 44 files, 237 tests passed (13.85s); npm run lint → exit 0; npm run build → exit 0, 983 modules (2.30s). Prior temporary edit typo was caught by tests/build and removed before this final run.
- Build warnings remain: host Node 22.7.0 is below Vite's supported version; existing Monaco/app bundles exceed 500KB. No new dependencies installed.
- Completion scope: implemented CRUD, versioned local workspace save and semantic inspector. Browser verification is blocked by absent controls; manual gestures/download QA remains pending. Source LF/CRLF insertion minor is deferred as recorded.
