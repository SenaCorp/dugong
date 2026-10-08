# Workspace tools

Approved continuation of the visual editing roadmap. Execute natively without another approval gate, following the user's instruction.

## Intent
Complete the existing canvas editing workflow: create, duplicate and delete elements; save manual arrangements across reload; inspect mode-specific properties. Source remains authoritative and all actions stay local. Reuse the parser, source patcher, history and renderer.

## Behavior
- Add creates a root element with a collision-free ID appropriate to the current mode. Duplicate copies the selected element's label, shape and semantic properties, retains its group, and creates no extra relationships.
- Delete removes that element and its direct relationships. Preserve unrelated elements, comments, styles and group structure. Sequence notes involving a deleted participant disappear; remove affected activation annotations together to prevent dangling bars.
- Each visual action is one source/position history entry. Structural/property changes may release position pins to let ELK accommodate changed dimensions; undo restores the prior arrangement.
- Save workspace stores a versioned source/positions snapshot locally. Source continues autosaving. On startup use snapshot positions only when its source matches the current source, avoiding stale positions against a different graph. Source changes after saving show an unsaved status. Reset/examples clear the saved arrangement. Storage failure is visible and never blocks editing.
- A compact inspector opens from selected elements. Flow/C4 group names, C4 technology/description, ER attribute rows, sequence frame branch conditions and participant box names are editable. Apply patches valid source in one undo entry; cancel changes nothing. Decorations remain non-draggable.
- Keep source syntax constraints; errors must retain the previous graph. No new dependencies.

## Verification
Focused source mutation, storage validation and SSR interface tests, then full Vitest/lint/build. Browser controls are not present in the available tool catalog; record browser gestures/downloads as unverified rather than claim QA. No Git repository: retain a file execution ledger.
