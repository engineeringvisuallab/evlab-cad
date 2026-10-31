# Tests

Run everything: `node tests/run-all.mjs` (or `npm test`). Needs Node.js 18 or newer and nothing else. Each `*.test.mjs` file also runs on its own: `node tests/entity.test.mjs`.

| File | Covers |
|---|---|
| viewport | world/screen conversion, zoom about the cursor, pan, fit, grid spacing |
| entity | line, polyline, rectangle, circle, arc geometry; validation; selection (pick, window, crossing); delete; tool state machines |
| precision | coordinate parsing (absolute, relative, polar), ortho, object snaps (endpoint, midpoint, centre, intersection, perpendicular, nearest), layers and visibility/lock/freeze effects |
| modify | move, copy, rotate, scale, mirror, offset, trim, extend, fillet, chamfer, explode, join, array, area, dimension values and association, undo/redo and rollback of failed commands |
| io | JSON save/load round trip, rejection of damaged/newer/inconsistent files, autosave isolation between projects |
| dxf | DXF export, import, round trip and second-generation stability; hand-written files in other programs' styles; unsupported-object reporting; colour mapping; format of integer/real group codes |
| layout | text, blocks (create/insert/explode/delete), JSON with blocks and layout, sheet scaling, plot-layer filtering, fit, PDF structure (xref offsets, stream length, page size, escaping), SVG, DXF text |
| extras | point, construction line, ray, node snap, polar tracking maths, break, stretch, their DXF/PDF/CSV output |
| important | grip editing for every entity type, linetypes through screen/PDF/SVG/DXF/JSON, polyline offset, dimension style (decimals, scale, size from layout) and its undo |
| civil | survey CSV parsing and plotting, chainage labels and marks, profile drawing, quantities and CSV output, one end-to-end scenario through JSON, DXF, PDF and SVG |
| deploy | serves the folder under `/evlab-cad/`, crawls every file the page loads, checks that all imports are relative and exist with exact case, no external dependencies, every toolbar/menu control has a handler |

## What these tests do NOT cover
* Mouse, keyboard and rendering behaviour in a real browser (canvas drawing, dialogs, file pickers, drag, wheel). There is no browser automation here.
* Whether exported DXF/PDF open correctly in third-party software. Structure is checked; real-world acceptance has not been.
* Performance with very large drawings.
