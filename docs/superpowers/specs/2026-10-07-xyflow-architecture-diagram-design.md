# React Flow Architecture Diagram Design

## Goal

Replace the Vite starter screen with a clear, polished, interactive rendering of the architecture described in `diagram.md`, using the already installed `@xyflow/react` package.

## Source of truth

`diagram.md` remains authoritative for node names, group membership, connection directions, and edge labels. The canvas must represent the API Gateway, Application Services, Infrastructure, Core, Third Party, Web, Host, and RE sections. The `RE` connection from services resolves to the Rule Engine inside the RE group.

## User experience

- Show a compact page heading and a large canvas that uses the available viewport.
- Arrange components into clearly labeled domain groups with a restrained, dark technical palette and distinct accents per group.
- Use readable custom React Flow nodes, directional edges, and a visible `Private` label on private integrations.
- Support normal React Flow pan, zoom, selection, fit-to-view, controls, and minimap interactions.
- Keep the diagram usable on narrow screens by allowing the canvas to occupy the available width and height; users can pan and zoom rather than forcing every node to fit at once.

## Implementation boundaries

- Replace the starter content in `src/App.tsx` and its starter styles in `src/App.css` and `src/index.css`.
- Keep node and edge definitions close to the view unless the implementation becomes hard to maintain; avoid adding dependencies beyond `@xyflow/react`.
- Preserve the relationships and labels expressed by `diagram.md`; do not invent additional systems or connections.
- Do not add editing, persistence, search, or Mermaid parsing. This is a hand-authored visualization of the supplied Mermaid source.

## Acceptance criteria

1. The page renders every named component and domain from `diagram.md`.
2. Every declared relationship has a directed visual edge, including shared destinations and `Private` connections.
3. The canvas includes controls and a minimap, opens with the whole architecture framed, and remains navigable at desktop and mobile widths.
4. The Vite production build succeeds.
