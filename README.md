# EVLab CAD
Browser-based 2D CAD (Engineering Visual Lab). No build step, no dependencies.
**Status: Milestone 4 of 8.** Run: `python3 -m http.server 8000` in this folder, open http://localhost:8000 (ES modules need http, not file://). Tests: `node tests/viewport.test.mjs && node tests/entity.test.mjs && node tests/precision.test.mjs && node tests/modify.test.mjs`.
Functional: canvas, adaptive major/minor grid, X/Y axes, wheel zoom at cursor, pan (Pan button, middle mouse, or Space+drag), zoom in/out/reset, F7 grid toggle, live world coordinates, units label.
Not built yet: everything else in the spec (drawing tools, layers, command line, DXF…). Zoom extents currently resets the view because the drawing is empty.
Deploy: push to a public repo, Settings → Pages → Deploy from branch → main / (root). Paths are relative; `.nojekyll` included.

Milestone 2 adds: line, polyline, rectangle, circle, arc (centre, start, end); click/shift/window/crossing selection (box test uses bounding boxes); properties panel with editable geometry (validated, rejects invalid values); Delete key/button. Grips are display-only (not draggable yet). Delete cannot be undone until Milestone 4.

Milestone 3 adds: coordinate entry (`100,200`, `@50,0`, `@100<45`, direct distance), object snaps (endpoint, midpoint, center, intersection of line/polyline segments, perpendicular, nearest), grid snap (F9), ortho (F8), OSNAP toggle (F3), layers (create, delete-if-empty, rename, current, colour, visible/lock/freeze, assign, isolate), and a command line (LINE, PLINE, CIRCLE, ARC, REC, ERASE, DIST, LAYER, ZOOM, PAN, ORTHO, SNAP, OSNAP, HELP; Enter repeats/finishes, Esc cancels, Up/Down history).
Not built: polar tracking, dynamic input, circle/arc intersection snaps, line type/weight UI (stored in the model only), plot flag UI, paper space. Other spec commands answer "planned for Milestone N".

Milestone 4 adds: undo/redo (Ctrl+Z / Ctrl+Y, snapshot-based; every command is a transaction that rolls back on error); select objects first, then MOVE, COPY, ROTATE (click or type degrees), SCALE (type factor), MIRROR (keeps originals), ARRAY rows cols rowSpacing colSpacing, EXPLODE (polylines), JOIN (lines/open polylines), AREA; OFFSET n (lines, circles, arcs), TRIM/EXTEND (lines against line/polyline edges), FILLET r / CHAMFER d (two lines); DIST and AREA measurements; linear, aligned, radius and diameter dimensions (values always computed; radius/diameter and line-referenced aligned dims update when the object changes; point-picked dims are fixed points).
Not built: STRETCH, BREAK, angular dims, leaders, text/dimension style editor (fixed default style: 2 decimals, scale 1), polyline offset, trimming arcs/circles, polar array. Dimension window-selection tests each dimension line separately.
