# Flowlab

A local diagram workspace: write a small Mermaid-like diagram language in Monaco and explore the result in React Flow. ELK automatically places nodes and routes separate orthogonal flowchart connections. Hover a node to highlight its incoming/outgoing connections and direct neighbors; the focused node gets a soft glow, active dashed edges carry a moving light, and unrelated elements fade. Neighbor nodes have a gentler halo. Effects follow the displayed route geometry, and reduced-motion preferences disable the moving light and dash animation.

This intentionally supports **flowchart, sequence, C4, and ER subsets**, not full Mermaid compatibility. Mermaid is not installed and its SVG renderer is not used.

## Stack

React 19, strict TypeScript, Vite, Tailwind CSS v4, `@xyflow/react`, `elkjs`, `@monaco-editor/react`, local `monaco-editor`, and Vitest. No backend, authentication, database, or remote diagram processing.

## Running locally

Use Node 22.22.3 (see `.nvmrc`), or a supported newer Node version.

```sh
nvm use
npm install
npm run dev
```

```sh
npm test             # parser, layout, routing, and direct-neighbor highlight tests
npm run test:watch
npm run lint
npm run build
npm run preview
```

If switching between Intel/Rosetta and native Apple Silicon Node, reinstall dependencies under the chosen Node architecture to get matching native Vite bindings. The lockfile includes both platform optional dependencies.

## Running with Docker

Start Docker Desktop (or another Docker engine), then run:

```sh
docker compose up --build -d
```

Open **http://localhost:8087**. Docker installs dependencies and builds the app with Node 22.22.3, then serves the production files through Nginx. No local Node installation is needed. This mode serves a production build; run the same command again after source changes to rebuild it.

```sh
docker compose logs -f web    # View logs
docker compose ps            # View container/health status
docker compose down          # Stop and remove the container
```

To use a different host port:

```sh
FLOWLAB_PORT=8081 docker compose up --build -d
```

The container listens on port 8087 and exposes `/health` for its health check. Hashed assets, including Monaco and ELK workers, are served locally with long-lived cache headers; the page itself is revalidated. Missing asset paths return 404, and application paths fall back to the SPA entry page.

Diagram processing and storage remain in your browser. No database volume is needed. Browser storage is separate for each origin, so diagrams saved at `localhost:5173` are not automatically shared with `localhost:8087`.

## Supported syntax

Start with `flowchart LR`, `RL`, `TD`, or `BT` (right, left, down, or up).

```text
flowchart LR

%% Comments and blank lines are ignored
A[Mobile App]
B(API Gateway)
C{Approved?}
D[(PostgreSQL)]

A -->|POST /orders| B
B --> C
C --> D
```

- Rectangle: `A[Label]`
- Rounded: `A(Label)`
- Decision: `A{Label}`
- Database: `A[(Label)]`
- Connection: `A --> B`
- Labeled connection: `A -->|HTTP POST| B`
- Inline nodes: `A[Mobile] --> B[Gateway]`
- Multiple destinations or sources: `A --> B & C`, `A & B --> C`
- Classic edge labels: `A -- Private --> B`
- Longer arrows: `A ---> B` (same connection behavior)
- Groups: `subgraph API[API Gateway]`, node declarations, then `end`. Groups can nest.
- A connection to a group containing exactly one leaf node resolves to that node. For groups with several nodes, specify the destination node ID; ambiguous connections produce a useful error.
- An optional leading `---` frontmatter section supports `config.theme: light` or `dark`. Other layout/config settings remain metadata; ELK remains the layout engine.
- IDs start with a letter or underscore, followed by letters, numbers, underscores, or hyphens.
- Referenced nodes are created automatically. Explicit definitions update implicit labels. A later explicit definition replaces an earlier one.
- Whitespace is flexible. Quoted labels are accepted. Write one declaration or connection per line.

Errors appear under the editor and as Monaco markers. Click an error to jump to its line. While source contains errors, the preview retains the **last fully valid diagram**. The first invalid saved source shows an explanatory empty state until fixed or reset.

The default example is the repository's [diagram.md](diagram.md): 8 groups, 19 nodes, 28 connections, including 12 `Private` relationships. Reset reloads this example. Expand hides the source panel and gives the diagram the full workspace; Show source restores the editor. Both reframe the graph. Existing custom saved source is preserved; the previous untouched six-node default is migrated to this architecture sample.

Rectangle and rounded nodes are custom React Flow component cards with a component symbol, source ID and readable name. Database and decision nodes retain their distinct shapes. Groups get automatic pastel colors, inherited by their member nodes; active connections and glow use the hovered component's group color. Colors follow sorted group IDs, so reordering declarations or renaming labels preserves them. The eight-color palette repeats for diagrams with more than eight groups; adding/removing group IDs may change palette assignments. No Mermaid theme configuration is required.

### Flowchart connections and source styling

Choose **Examples → Flowchart · Styled connections** to load [samples/styled-flowchart.mmd](samples/styled-flowchart.mmd). Colors identify clients, services, asynchronous workers, storage, and external systems. Main requests use thick connectors, events use dotted links, payment uses a two-way arrow, and telemetry/failure signals have circle/cross endpoints. Private links retain their existing contrast and hover behavior.

| Input | Appearance |
| --- | --- |
| `A --> B` | Normal arrow, subtle dashed default |
| `A --- B` | Solid line, no arrow |
| `A -.-> B`, `A -.- B` | Dotted arrow / dotted line |
| `A ==> B`, `A === B` | Thick arrow / thick line |
| `A <--> B`, `A <-.-> B`, `A <==> B` | Two-way normal / dotted / thick arrows |
| `A --o B`, `A --x B` | Circle / cross endpoint |
| `A o--o B`, `A x--x B` | Circle / cross endpoints at both ends |
| `A ~~~ B` | Invisible layout connection |

Labels work with pipe syntax (`A -.->|Order event| B`) and classic syntax (`A -. Order event .-> B`, `A == Main request ==> B`, `A -- Private --> B`). Extended dash/dot/equal lengths are accepted; this tool does not currently translate extra length into extra layout ranks. Use spaces around letter markers `o`/`x` to avoid ambiguity with node IDs. Chained connections still require separate lines.

Invisible connections affect ELK layout but are not drawn, counted as visible edges, or considered in hover highlighting. Visible active connections animate dashed movement while preserving their endpoint type. Circle/cross glyphs sit just outside node borders so cards do not obscure them.

```text
flowchart LR
classDef service fill:#edf7f3,stroke:#2d7b73,color:#204c45,stroke-width:1.5px
classDef storage fill:#f4effa,stroke:#795ba5,color:#533779

API(API Gateway):::service --> DB[(Database)]
class DB storage
style API stroke-width:2px
```

Supported styling:

- `classDef name properties` defines classes; comma-separated class names can share a definition.
- `class A,B service` assigns classes; `A[Label]:::service` assigns inline. Forward references are resolved after parsing.
- `classDef default ...` applies a baseline. Named class properties override defaults; direct `style A ...` overrides classes. Later class definitions replace earlier definitions; multiple class assignments are applied in declaration order.
- `style ID properties` styles a node or group. Classes can also style subgraph IDs.
- Properties: `fill`, `stroke`, `color`, `stroke-width` (0.5–8px), `stroke-dasharray` (positive dash lengths separated by spaces or escaped commas, e.g. `5\,3`). Colors accept hex, named colors and numeric `rgb`/`rgba`/`hsl`/`hsla` functions. Named color validity ultimately follows the browser's CSS color support.
- Custom fill/text/border colors remain on hover; connection glow uses the hovered node's explicit stroke color when present. SVG shape outlines use the supplied dash pattern; component cards/groups use a CSS dashed border.

Unknown classes, missing targets, unsupported style properties and malformed values produce diagnostics and retain the last valid preview. This is a styling subset, not arbitrary Mermaid/CSS styling: no arbitrary theme variables, `linkStyle`, edge IDs, animation classes, fonts, visibility/opacity overrides, external CSS, or arbitrary properties are supported yet.

### Animated login sequence sample

Choose **Examples → Login sequence** in the application header to load [samples/login-sequence.mmd](samples/login-sequence.mmd) and expand the preview. It has five participants and eleven total messages, including two mutually exclusive branches: a successful login (nine played messages) and an incorrect password (seven played messages). The sequence plays once automatically, highlighting one message and its sender/recipient at a time. **Play flow** replays from the beginning; **Stop** clears playback. **Show source** returns to the editable source panel; **Reset** restores the architecture example.

Supported sequence syntax is deliberately small:

```text
sequenceDiagram
    autonumber
    actor User
    participant Web as Web App
    User->>Web: Submit credentials
    alt Password valid
        Web-->>User: Show dashboard
    else Password incorrect
        Web-->>User: Show invalid password error
    end
```

Supported: `participant`, `actor`, `as` aliases, optional `autonumber`, nested `alt` / `else` / `end`, `loop` and `opt` blocks, notes, participant boxes and activation bars, `->>` requests, `-->>` responses, self-messages, implicit participants, blank lines and `%%` comments. Messages retain source order. Hover takes priority over playback highlighting and shows only that participant's direct messages. Unsupported lines show diagnostics and retain the last valid preview. Autoplay is disabled for reduced-motion preferences; the controls remain available and animated SVG effects respect reduced motion. The **Playback path** selector chooses the condition for each `alt` frame. All branches remain visible; playback runs common messages and exactly the selected alternative in each block, including nested alternatives. Changing a condition restarts playback for the selected path unless reduced motion is enabled. Conditions are descriptive labels, not JavaScript expressions, and are not evaluated against live data. Number labels retain source order, so skipped alternatives may cause numbering gaps. Empty alternatives are supported and still reserve frame/header space. Branch choices are local React state and reset after the source produces a new layout; they are not included in workspace saves.

### Annotated sequence flow

Choose **Examples → Sequence · Full login** for [samples/login-annotated.mmd](samples/login-annotated.mmd). It demonstrates frontend/backend grouping, a password alternative, a session-write loop, an optional trusted-device step, notes, and activation bars. Participant positions still come from ELK; timeline rows reserve separate space for condition headers and notes.

```text
sequenceDiagram
    participant Web
    box Backend
        participant API
        participant DB
    end
    Note over Web,API: Requests use HTTPS
    Web->>API: Submit request
    activate API
    loop Retry while pending
        API->>+DB: Read status
        DB-->>-API: Current status
    end
    opt Cache enabled
        Note right of API: Save a local result
        API->>API: Cache response
    end
    deactivate API
    API-->>Web: Return result
```

- `loop Description ... end` supports nesting and displays a loop frame. Playback shows **one iteration**; descriptive text is not executed and does not determine a repeat count.
- `opt Condition ... end` supports nesting. **Playback path** offers Include/Skip; Skip removes optional messages from playback, while the full diagram remains visible.
- `activate ID` / `deactivate ID` produce balanced activation bars; nested activations are offset. `A->>+B` activates the receiver; `B-->>-A` deactivates the sender after the response. Message endpoints connect to the active bar perimeter. Balance each activation in the same branch where it opens; cross-branch activation merges are not supported.
- `Note left of ID: text`, `Note right of ID: text`, `Note over ID: text`, and `Note over A,B: text`. `<br/>` inserts line breaks. Notes have their own timeline space and follow the owning participants' hover visibility.
- `box Label ... end` groups participant/actor declarations, with an automatic pastel palette. Optional colors: `transparent`, `blue`, `green`, `yellow`, `red`, `purple`, `gray`/`grey`, or a six-digit hex color. Example: `box #e3efd9 Backend`. Boxes do not nest or contain messages/frames; a participant belongs to at most one box.

Malformed blocks, notes, duplicate group membership and unbalanced activations produce source diagnostics while preserving the last valid diagram. Notes and bars are annotations, not extra participants, and are excluded from toolbar counts. Hover decorations do not change the active participant.

### C4 architecture diagrams

Use **Examples** in the header to load Context, Container, Component, Dynamic, or Deployment samples. C4 uses native React Flow cards with element type, technology, description, and an external badge. Nested boundaries have automatic group colors. All positions and orthogonal routes come from ELK. Direct hover highlights and animates connected relationships; **C4Dynamic** also supports ordered autoplay, Play flow, and Stop.

```text
C4Container
title Shopping platform
Person(customer, "Customer", "Places orders")
System_Boundary(platform, "Shopping Platform") {
  Container(api, "Order API", "Node.js", "Coordinates orders")
  ContainerDb(db, "Orders", "PostgreSQL", "Stores order records")
}
Rel(customer, api, "Creates order", "HTTPS")
Rel(api, db, "Saves order", "SQL")
```

Supported core syntax:

- Headers: `C4Context`, `C4Container`, `C4Component`, `C4Dynamic`, `C4Deployment`.
- Elements: `Person`, `System`, `Container`, `Component`; `Db` and `Queue` variants for systems, containers, and components; `_Ext` external variants.
- Person/system arguments: alias, label, optional description. Container/component arguments: alias, label, optional technology, optional description.
- Groups: `Boundary`, `Enterprise_Boundary`, `System_Boundary`, `Container_Boundary`, followed by `{` and a closing `}`. They may nest.
- Deployment boundaries: `Deployment_Node`, `Node`, `Node_L`, `Node_R`, with alias, label, optional type and description. L/R aliases do not force layout direction.
- Relationships: `Rel(from, to, label, technology?)`, `BiRel` with arrowheads at both ends, `Rel_Back` with reversed endpoints, and `RelIndex(index, from, to, label, technology?)`. Dynamic numbering and playback follow declaration order.
- Plain `title` text, positional arguments, single/double quoted strings, escaped quotes, multiline calls, `<br/>` line breaks, and `%%` comments.

Declare relationship endpoints explicitly as elements. Boundary aliases are not connection endpoints. Duplicate aliases and unsupported declarations produce line diagnostics while retaining the last valid preview. Samples are in `samples/c4-*.mmd`.

This is a C4 input subset, not full Mermaid C4 compatibility. Named arguments, sprites, tags, legends, styling macros, layout configuration, directional relationship macros, and C4 frontmatter/directives are not supported.

### Entity relationship diagrams

Choose **Examples → ER · Order database** to load [samples/orders-er.mmd](samples/orders-er.mmd). It shows customers, orders, order items, products, and payments. Native React Flow table cards display fields, types, key badges, and optional comments. ELK places tables and routes relationships; hover highlights only the table's direct relationships and neighbors.

```text
erDiagram
    direction LR
    CUSTOMER {
        uuid id PK
        string email UK
    }
    ORDER {
        uuid id PK
        uuid customer_id FK
    }
    CUSTOMER ||--o{ ORDER : places
```

Supported ER syntax:

- `erDiagram`, optional `direction LR`, `RL`, `TB`/`TD`, or `BT`; the workspace defaults to LR.
- Standalone or implicit entities, quoted names, and aliases such as `CUSTOMER[Accounts]`.
- Attribute blocks with one `type name` declaration per line. Types may include parentheses, array brackets, or a trailing nullable `?`; `*name` is accepted as PK shorthand.
- Optional `PK`, `FK`, `UK`, comma-separated compound constraints, and trailing double-quoted comments.
- Cardinality markers: exactly one (`||`), zero or one (`|o` / `o|`), one or more (`}|` / `|{`), zero or more (`}o` / `o{`). Left/right markers follow Mermaid's side-specific notation.
- Identifying `--` relationships are solid at rest; non-identifying `..` relationships are dashed. Both show native crow's foot/bar/circle endpoint glyphs rather than arrowheads, and animate on hover.
- Relationship labels after `:`, quoted or plain text; blank lines and full-line `%%` comments.

Malformed attributes, duplicate fields, and invalid cardinalities produce line diagnostics and retain the last valid diagram. This supports the documented ER subset: textual cardinality aliases, inline attribute blocks, Markdown labels, Mermaid styling/configuration, and SQL import are not implemented. ER diagrams visualize the supplied source locally and do not connect to a database.

## Architecture

```text
Source text
  → deterministic parser
  → independent DiagramGraph
  → ELK layered layout in a local web worker
  → React Flow node/edge adapter
  → custom nodes and routed dashed edges
```

- `src/app/App.tsx`: editor/preview composition.
- `src/components/EditorPanel.tsx`: locally bundled Monaco and diagnostics.
- `src/features/diagram/parser/`: cursor-based node scanner, typed edge parser, direction and graph assembly. `flowArrows.ts` scans connector types; `flowStyles.ts` resolves source classes and direct styles independently of rendering.
- `src/features/diagram/types/diagram.ts`: renderer-independent graph types.
- `src/features/diagram/layout/elkLayout.ts`: compound group layout, dimensions, separate per-edge ports, ELK options, geometry conversion. Node coordinates and bend points come from ELK; diamond endpoints are adjusted to their actual perimeter.
- `src/features/diagram/layout/placeLabels.ts`: label placement on ELK routes, avoiding nodes and other labels where available space permits. Repeated labels do not introduce extra ELK layout layers.
- `src/features/diagram/parser/parseC4.ts` and `c4Syntax.ts`: C4 declaration scanning and independent element/boundary/relationship metadata.
- `src/features/diagram/renderer/nodes/C4Node.tsx`: native C4 presentation with technology, descriptions and external status.
- `src/features/diagram/parser/parseSequence.ts`: deterministic parser for the documented sequence subset.
- `src/features/diagram/layout/sequenceLayout.ts`: ELK places participant columns in declaration order using a layout-only chain; message rows follow chronological order and use horizontal routes or self-call loops. These sequence routes are generated from participant positions and message order, rather than the flowchart router.
- `src/features/diagram/parser/sequenceFragments.ts` and `layout/sequenceTimeline.ts`: nested alt/loop/opt ranges and timeline space for conditions, separators and notes.
- `src/features/diagram/parser/sequenceAnnotations.ts`: grouping, notes, balanced activation stacks and line diagnostics.
- `src/features/diagram/layout/sequenceDecorations.ts` and `sequenceActivation.ts`: native annotation geometry and message endpoints at activation bars.
- `src/features/diagram/hooks/sequencePlaybackPath.ts`: selects one branch per alternative without evaluating condition text.
- `src/features/diagram/parser/parseER.ts` and `erSyntax.ts`: independent ER entities, attributes, keys and cardinalities.
- `src/features/diagram/renderer/nodes/EntityNode.tsx` and `renderer/edges/ERCardinality.tsx`: native table cards and endpoint notation.
- `src/features/diagram/hooks/useSequencePlayback.ts`: local 1.1-second message playback with stop/replay and timer cleanup.
- `src/features/diagram/renderer/`: eleven custom shapes, native group boundaries, rounded orthogonal SVG paths inside React Flow, and small label pills. Private edges remain visible at rest and animate on direct node hover.
- `src/features/diagram/hooks/useNodeHighlight.ts`: one direct-neighbor calculation, without recursive tracing.
- `src/features/diagram/hooks/useDiagram.ts`: 300ms debounce, stale-result protection, error recovery, reset and persistence.
- `src/styles/globals.css`: warm light workspace, responsive layout, 140ms hover transitions and 780ms dash animation. Reduced motion is respected.

Monaco and ELK workers are served from the local Vite build, not a CDN. The latest source autosaves to `localStorage` under `diagram-tool-source`. **Save workspace** additionally writes a versioned source/manual-position snapshot under `diagram-tool-workspace`. Disabled storage does not prevent editing; explicit save failures appear above the preview. Reset restores the sample, clears diagnostics, saves the sample, and reframes after layout. Fit View reframes without changing source.

## Current limitations

Only the documented flowchart, sequence, C4, and ER subsets are supported. Sequence diagrams do not yet support parallel/critical/break fragments, nested boxes, arbitrary CSS box colors, cross-branch activation merges, arbitrary directives, or additional arrow types. Loop playback shows one iteration; conditions are descriptive. No other diagram types, full Mermaid themes/directives, arbitrary CSS or link styling beyond the documented subset, fenced Markdown import, chained flowchart edges, or group-level connections with multiple possible destinations. Although the architecture sample filename is `.md`, its contents are raw flowchart source with frontmatter; arbitrary Markdown documents are not parsed. ELK improves flowchart routing but dense/non-planar graphs may still have crossings. Very dense diagrams may leave insufficient space for every label. Large graph fit-to-view may require Expand and zooming to read labels. Long sequence labels may wrap; this renderer is intended for small examples. Monaco is a substantial editor bundle and is loaded separately from the workspace.

## Next ideas

Shareable URLs, custom theme variables, keyboard shortcuts, and diagram templates can extend the independent graph/layout layers. These are not part of this MVP.

## References

[ELK port constraints](https://eclipse.dev/elk/reference/options/org-eclipse-elk-portConstraints.html), [React Flow custom edges](https://reactflow.dev/learn/customization/custom-edges), [Monaco ESM integration](https://github.com/microsoft/monaco-editor/blob/main/docs/integrate-esm.md), [Mermaid sequence syntax](https://mermaid.js.org/syntax/sequenceDiagram.html), [Mermaid C4 syntax](https://mermaid.js.org/syntax/c4.html), [Mermaid ER syntax](https://mermaid.js.org/syntax/entityRelationshipDiagram.html), [Mermaid flowchart syntax](https://mermaid.js.org/syntax/flowchart.html).


## Additional flowchart shapes

```text
flowchart LR
A([Start])
B((Event))
C(((Finished)))
D{{Preparation}}
E[/Input/]
F[/Manual input\]
G[[Subroutine]]
```

Stadium, circle, double circle, hexagon, parallelogram, trapezoid and subroutine respectively. These seven shapes extend the existing rectangle, rounded, decision and database shapes. The shape gallery in the example picker demonstrates them with groups and labels. Circle dimensions remain square; ELK ports are projected onto curved/polygon outlines. Mirrored parallelogram/trapezoid variants and Mermaid's `@{shape: ...}` syntax are not supported.

## Preview theme

```text
---
config:
  theme: dark
---
flowchart LR
A[User] --> B[API]
```

Use `light` to restore the warm light canvas. The same configuration works before sequence, C4 and ER source. A JSON directive `%%{init: {"theme":"dark"}}%%` is also supported. `default`, `base`, `neutral`, `forest`, `redux` and `redux-color` are accepted as aliases for this application's light appearance; they do not reproduce Mermaid's palettes. Invalid themes/config show diagnostics while retaining the last valid preview. Editor colors remain light. Explicit `classDef`/`style` colors take precedence; choose readable colors for your selected theme. Arbitrary YAML, `themeVariables` and Mermaid's complete configuration API are not implemented.

## Export

The preview toolbar provides **SVG** and **PNG** downloads, processed locally without extra dependencies. Export captures the complete rendered graph with its routes, labels, node styling and selected preview theme, independently of pan/zoom. It omits the editor, toolbar, handles and animated glow overlays. Dimmed elements are restored to full opacity in the snapshot. PNG renders at up to 2× resolution, capped at 8192 pixels per side and 16 million pixels to bound memory.

SVG embeds styled HTML via SVG `foreignObject` to preserve native React Flow cards and ER tables. Modern browsers support this format; vector editors and image viewers without `foreignObject` support may not display it. This is a static snapshot, not an editable interchange graph. PNG export relies on the browser's SVG-to-canvas support; failures appear above the preview and leave the diagram intact. Export font rendering uses locally available fonts.

Implementation: `parser/sourceConfig.ts` reads the small config subset; `renderer/nodeGeometry.ts` supplies outlines/perimeter projection; `renderer/diagramTheme.ts` adapts group colors; `export/exportDiagram.ts` snapshots the native renderer; `export/exportBounds.ts` calculates graph bounds and safe raster dimensions.

## Visual editing

- **Drag a node** to arrange the diagram. Edges stay attached while dragging; on release, affected routes avoid node bounds using orthogonal routing. Node overlap or an impossible route cancels the move with an explanation.
- **Click a node** to select it. **Double-click** a node or edge label/path to edit wording. Enter saves, Escape cancels; Shift+Enter adds a line break to flowchart nodes, sequence wording or C4 labels. ER labels and flowchart edge labels remain single-line.
- Flowchart selection shows a **shape selector** and **fill color picker**. Source IDs, connections and class assignments remain intact. Fill changes become ordinary source `style` declarations.
- Pull the **right connection handle** onto another node's **left handle** to add a source connection. Defaults: `-->` for flowcharts, `Rel(..., "Relationship")` for C4, `->>: Message` for sequence, and `||--o{ : relates` for ER. These are starter relationships; edit their wording on the canvas or their connector/cardinality in source.
- **Auto layout** clears manual positions and runs ELK. **Fit view** adjusts the camera only. Inline wording changes retain manual placements when card dimensions stay the same. Dimension-changing wording releases manual pins so ELK can make room. Add/Duplicate/Delete, shape changes, and inspector changes to dimensions release manual pins so ELK can make room; undo restores the prior source and arrangement.
- **Undo/redo** buttons restore source and positions together. Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z (or Ctrl+Y) work outside text fields. Monaco and the wording input retain their own text undo. Consecutive source typing coalesces over 750ms; one completed drag is one history action. History retains up to 100 snapshots.
- **Save workspace** preserves source and manual positions across reload. The button shows **✓ Saved** while the current document matches the snapshot; changing source or positions makes it available again. Source continues autosaving independently. On reload, saved positions are used only if snapshot source matches the latest source; otherwise automatic layout is used to avoid stale pins. Undo history stays **session-only**. Reset/example loading starts a fresh history and clears the saved arrangement. Draft edits and active drag/connection sessions are invalidated when the underlying document changes.

### Mode-specific editing

Flowcharts support node wording, shape, fill and edge labels. C4 edits names and relationship wording while preserving technology/descriptions and semantic element types. ER edits entity aliases and relationship wording while preserving entity IDs and attribute definitions. Sequence supports participant/message/note wording; participants move horizontally without changing their order, and lifelines/activation bars/notes/frames/boxes follow. Cards keep at least 20px between columns. Spanning notes retain enough width for their text when columns narrow.

An expanded expression such as `A & C --> B` defines multiple relationships on one source line. Editing one of those labels is rejected to protect the other relationships; split it into individual source lines first. **Inspect** opens a compact property panel: select any element from its dropdown, or click a group/sequence frame/box heading. Edit group names, C4 technology/descriptions, ER attributes (type/name/PK/FK/UK/comment) and sequence branch conditions. Apply is one undo action. Inspector drafts refresh when source or preview revisions change. Uncolored sequence boxes cannot be renamed to start with a recognized color token; add an explicit color in source first or use a different name. Comments and unsupported directives are never reserialized wholesale; canvas patches affect specific declaration spans and are parsed again before committing.

### Create, duplicate and delete

**+ Add** creates a root element for the current diagram mode with an unused ID. Click it to select and rename it. **Duplicate** copies the selected leaf element's shape, resolved flowchart style, C4 metadata, ER attributes or sequence actor type, and keeps its parent group/box. It does not copy relationships. **Delete** removes the selected leaf element and directly connected relationships; unrelated implicit neighbors and group structure remain. Both actions are available in the selected-node toolbar and inspector. Structural actions automatically fit the updated graph.

Sequence deletion also removes notes referencing that participant. When a removed message starts/ends an activation on another participant, that participant's activation annotations are cleared together so bars do not become unbalanced. Existing alt/else/loop/opt frames remain, even if a branch becomes empty. Group/box deletion, membership changes, new sequence fragments, C4 semantic type changes and visual connector/cardinality selection still use source edits.

### Verification scope

Source patching, storage validation, layout/routing, history and rendered controls have automated tests. Browser drag/click/download interaction has not been directly verified in the current environment because browser automation controls are unavailable. SVG export remains a `foreignObject` snapshot with the compatibility limits above.

Implementation: `editing/editSource.ts`, `elementActions.ts`, `inspectorEdits.ts` and `editModeSource.ts` patch the source; `workspaceStorage.ts` validates snapshots; `DiagramInspector.tsx` and `ERAttributeFields.tsx` expose semantic properties; `documentHistory.ts` stores snapshots; `manualLayout.ts`, `moveSequence.ts` and `orthogonalRouter.ts` apply positions and routing; `CanvasEditingTools.tsx` provides the wording editor and node toolbar. The design and execution checklist are under `docs/superpowers/`.
