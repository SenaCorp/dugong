# Mermaid Markdown Upload Design

## Goal

Turn Flowlab's fixed architecture canvas into a browser-only Mermaid viewer. A user can upload a Markdown file containing a Mermaid code fence and see the resulting diagram in the existing canvas.

## Approved approach

Keep React Flow as the canvas and pan/zoom surface. Render the Mermaid source with Mermaid.js and present its SVG as one diagram in the canvas. This preserves Mermaid's own layout and supports every diagram type implemented by the installed Mermaid version, instead of trying to translate Mermaid syntax into React Flow nodes and edges. Apply Flowlab's dark sage palette to the rendered SVG so uploads match the visual style of the original canvas.

## User flow

- The current `diagram.md` remains the initial example.
- The user can select or drop a `.md` file into the viewer.
- Read the file locally in the browser and extract the first fenced block labelled `mermaid` (case-insensitive; allow whitespace around the fence label). If there is no such fence, accept a file whose full content is a Mermaid source document, including Mermaid frontmatter, as used by the existing `diagram.md`.
- Render the extracted source and replace the current diagram only when parsing and rendering succeed.
- If neither a Mermaid fence nor a valid bare Mermaid source document exists, or Mermaid reports invalid syntax, show a readable error and preserve the last successfully rendered diagram.
- Keep the existing pan, zoom, minimap, and frame controls. Update the diagram title/status to reflect the selected filename.

## Rendering and safety

- Add Mermaid.js as a runtime dependency; no server or remote upload is introduced.
- Use Mermaid's parser/render API, honor frontmatter layout configuration in the source, and use strict security mode for diagram rendering. Normalize diagram colors to Flowlab's visual theme.
- Display rendered SVG as an image/isolated SVG resource rather than injecting raw Markdown or source text into the application DOM.
- Revoke any generated object URL when it is replaced or the viewer unmounts.
- Do not execute scripts or fetch the source file over the network.

## Scope

- Support one Mermaid block per file in v1; use the first block when there are several.
- Accept Markdown files only. A missing Mermaid diagram or malformed Mermaid source produces an inline error.
- No source editor, export flow, history, backend, or translation into editable React Flow nodes is included.

## Acceptance criteria

- The bundled `diagram.md` renders on initial load with its Mermaid layout configuration and Flowlab's visual theme.
- Uploading/dropping a Markdown file with a valid Mermaid block displays the rendered diagram, including non-flowchart diagram types supported by Mermaid.
- The canvas can pan and zoom the rendered diagram and frame it in view.
- Missing Mermaid fences, invalid Mermaid syntax, and non-Markdown files produce clear feedback without removing the previous valid diagram.
- Lint and production build complete successfully.
