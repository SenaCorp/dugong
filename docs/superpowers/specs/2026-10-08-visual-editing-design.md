# Visual editing design

Approved by the user in conversation: native implementation, all proposed steps.

Canvas and source become bidirectional. Node/edge wording edits patch individual source declarations, preserving IDs, comments and unrelated source. Flowchart node controls change shape/color and drag handles append connections. C4 labels, ER entity aliases and sequence participant/message/note wording use their own source syntax.

ELK remains the automatic layout engine. Drag positions are session-only absolute pins applied after ELK; incident routes and routes obstructed by moved nodes receive orthogonal obstacle routing. Auto layout clears manual pins. Text-only edits retain manual positions, Reset and example loading clear them. Sequence participant offsets are horizontal only; decorations, messages and activation bars follow their participant owner.

Single click selects a node; double click opens an anchored wording editor. Enter commits, Escape cancels, Shift+Enter adds a newline where supported. Hover is suspended during editing/dragging. Source edits and one completed drag each create one history entry. Undo/redo shortcuts operate outside Monaco and canvas text fields; Monaco retains its own text undo. Canvas edits reject unsupported syntax rather than corrupting source; source parser remains the final validation gate.

No backend, new packages or position persistence. Existing source-only localStorage remains. Verification covers source patches, history, manual routing and mode-specific moves, then tests/lint/build. Browser verification is contingent on available browser tooling and must not be claimed without evidence.
