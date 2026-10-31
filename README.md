# EVLab CAD

A free, browser-based 2D CAD drafting application by **Engineering Visual Lab (EVLab)**. *Engineering • Innovation • Learning*

Original code, inspired by common drafting conventions; not affiliated with Autodesk. Runs entirely in your browser: no account, no server, no paid service. Your drawings stay on your device unless you export or share a file.

**Version 0.10 (alpha).** Usable for simple 2D drafting, but read *Verification status* and *Known limitations* first.

## Verification status (please read)
Everything here was built and tested with automated Node tests (`npm test`, 11 test files, all passing). **The interface itself has not been exercised in a real browser by its author**: mouse handling, canvas drawing, dialogs and file pickers are untested, and exported DXF/PDF files have not been opened in third-party software. Expect to find bugs on first use; the checklist at the end of this file is the fastest way to find them.

## Run it
* Published: see `DEPLOY.md` (free GitHub Pages, step by step).
* Locally: `python3 -m http.server 8000` or `node serve.mjs` in this folder, then open http://localhost:8000. (Opening `index.html` by double-click does not work: JavaScript modules need http.)
* Tests: `npm test` or `node tests/run-all.mjs` (Node 18+, no installs).

## What works (completed)
| Area | Status |
|---|---|
| Workspace | Dark drafting canvas, adaptive major/minor grid, X/Y axes, wheel zoom at cursor, pan (button, middle mouse, Space), zoom extents, live coordinates, units label (mm/m), command line with history |
| Drawing tools | Line, polyline, rectangle, circle, arc (centre/start/end), point, construction line, ray, text and multi-line text, distance measurement |
| Precision | Coordinate entry `100,200`, `@50,0`, `@100<45`, direct distance, object snaps (endpoint, midpoint, centre, node, intersection of lines/polylines, perpendicular, nearest), grid snap, ortho, polar tracking (F10, `POLAR 15` sets the angle step), dynamic input readout of distance and angle (F12; display only, type values in the command line) |
| Selection | Click, Shift-toggle, window (left to right) and crossing (right to left) by bounding box, **grips you can drag** (line ends/midpoint, polyline vertices, circle radius and centre, arc ends and centre, base points of text/blocks/points; snaps to other objects while dragging; Esc cancels; undoable), properties panel with editable, validated geometry |
| Modify | Move, copy, rotate, scale, mirror, offset (lines, circles, arcs, polylines and rectangles, open or closed, mitred corners), trim and extend (lines), fillet and chamfer (two lines), break (lines, arcs, circles), stretch (crossing window), explode, join, rectangular array, area, cut/copy/paste, delete |
| Interface | Layers/Blocks panel, Properties panel and Command line each hide and show from toolbar buttons, the View menu, or the small edge tabs on the canvas; Ctrl+0 is Clean screen (hides all or restores all); your choice is remembered on this device |
| Layers | Create, delete (if empty), rename, current, colour, **line type**, visible, lock, freeze, assign selection, isolate, show all; plot flag and line weight stored and used by layouts |
| Linetypes | Continuous, Dashed, Hidden, Center, Phantom, Dot, Dash-dot; set per layer or per object (Properties); dash sizes are defined in millimetres on paper so they look the same on screen at the layout scale, in PDF/SVG and in DXF (`$LTSCALE`) |
| Dimensions | Dimension style panel (decimals, measurement scale, text height, arrow size, or size from layout scale); linear, aligned, radius, diameter, computed from geometry; radius/diameter and line-referenced aligned dimensions update when the object changes |
| Undo/redo | Every command is a transaction (Ctrl+Z / Ctrl+Y, 200 steps); a failed command restores the drawing |
| Projects | Versioned JSON (`.evlab`), New/Open/Save/Save As, validation on load, autosave (one browser-storage key per project), recovery offer after a crash or refresh, unsaved-changes warning |
| DXF | Export R2000 ASCII and import: LINE, CIRCLE, ARC, LWPOLYLINE, POLYLINE (2D), TEXT, MTEXT (simplified), layers (colour, on/off, frozen, locked, plot, lineweight), colours, units; unsupported objects are counted and reported |
| Blocks | Create from selection, insert with scale/rotation, edit insertion point in properties, explode, library panel, editable civil symbols (north arrow, manhole, valve, tree, survey point) |
| Layout | A4/A3/A2/A1, landscape/portrait, border, title block (project, title, drawing no., revision, scale), north arrow, one viewport at scale 1:N, fit to viewport, on-screen preview |
| Export | PDF (vector), SVG, DXF, CSV coordinates, CSV quantities |
| Civil toolbox | Survey points from CSV (numbers, elevations, descriptions), chainage marks along a centreline, longitudinal profile from a table, quantity take-off by layer |

## Not built yet (planned or out of scope)
* Entities: ellipse, spline.
* Modify: trim/extend of arcs/circles/polylines, polar array, break-at-point, stretch of dimensions and arcs by their end points; selection filtering.
* Precision: typing values into the cursor-side dynamic input box; tracking from object snap points.
* Annotation: angular dimensions, leaders, a text style editor (fonts), per-object dimension styles and arrowhead variants (one drawing-wide dimension style exists).
* Blocks: attributes; block definitions in DXF (references are exported as exploded geometry).
* DXF: POINT, ELLIPSE, SPLINE, HATCH, DIMENSION and INSERT import; bulge arcs in polylines; line types other than the seven above (imported as Continuous, with a warning). **DWG is not supported.**
* Layouts: multiple layouts, multiple viewports, per-viewport layers, plot styles; PNG export.
* Civil: contours, cross-sections, road offsets/superelevation, water supply layouts, bridge/culvert detail libraries. (Only the items in the table above exist.)
* Interface: Bengali and other languages (strings are currently inline, English only); 3D; GIS; plugins.

## Civil toolbox: drafting only
The civil tools **draw and count**; they do **not** perform or validate any engineering design (no hydraulics, structures, earthworks, stability or code checks). Quantities are taken from drawn geometry (closed-polyline area ignores holes). Anything used for design or construction must be checked independently by a qualified engineer.

## Commands (type in the command line; Enter repeats the last command or ends the current one; Esc cancels)
`LINE L`, `PLINE PL`, `CIRCLE C`, `ARC A`, `RECTANGLE REC`, `POINT PO`, `XLINE XL`, `RAY`, `TEXT T`, `MTEXT MT` · `MOVE M`, `COPY CO`, `ROTATE RO`, `SCALE SC`, `MIRROR MI`, `OFFSET O`, `TRIM TR`, `EXTEND EX`, `FILLET F`, `CHAMFER CHA`, `BREAK BR`, `STRETCH S`, `EXPLODE X`, `JOIN J`, `ARRAY`, `ERASE E` · `DIMLINEAR DLI`, `DIMALIGNED DAL`, `DIMRADIUS DRA`, `DIMDIAMETER DDI` · `DIST DI`, `AREA`, `QTO`, `CHAINAGE`, `COORDS` · `LAYER LA`, `BLOCK B`, `INSERT I`, `BLOCKS` · `UNDO U`, `REDO`, `ZOOM`, `PAN`, `ORTHO`, `POLAR`, `DYN`, `SNAP`, `OSNAP` · `NEW`, `OPEN`, `SAVE`, `SAVEAS`, `DXFIN`, `DXFOUT`, `LAYOUT`, `MODEL`, `PDF`, `SVG`, `HELP`.
Planned names (`DIMANGULAR`, `LEADER`, `ELLIPSE`) answer "not implemented yet" rather than pretending. Run `HELP` in the app for usage.

## Privacy and data safety
No network requests are made by the application. Autosave writes to your browser's local storage on your device. Files are validated before they replace the open drawing; invalid, damaged or newer-format files are refused with a reason and nothing changes. New/Open ask before discarding unsaved changes.

## Architecture (and where it differs from the suggested layout)
`index.html`, `css/main.css`, `js/app.js` (wiring), and modules under `js/`: `core` (document, entities, history, selection, coordinates, commands, viewport), `geometry` (transforms, modify operations, dimensions, blocks, expansion of compound objects), `renderer` (canvas, grid, snapping, entities, sheet), `tools` (draw and modify tool state machines), `ui` (panels), `io` (JSON, DXF, PDF, SVG, storage, file dialogs), `layouts` (paper space, title block), `blocks` (civil symbols), `civil` (survey, chainage, profile, quantities). Differences from the suggested tree, chosen to keep the code small: one stylesheet instead of four; tools are table-driven state machines in `draw-tools.js`/`modify-tools.js` rather than one file per tool; there is no separate `units.js` (units are a label plus a mm/m factor used by layouts and civil tools); geometry lives under `geometry/` as pure functions that the tests import directly. No third-party code is used, so there are no dependency versions to pin; the only tool needed is Node 18+ for tests.

File formats: project JSON `format: "evlab-cad"`, `version: 2` (version 1 files still open). Storage keys: `evlab:autosave:<project id>`.

## Known limitations
* Dragging a grip onto a degenerate shape (for example both ends of a line on the same point) is refused with a message; dimensions have no grips yet.
* Polyline offset bevels very sharp corners and refuses an offset so large that a segment would flip; it does not trim self-intersections, so check large offsets of concave shapes.
* Construction lines and rays are selected by their base point in window selections and have no intersection snaps yet; they are drawn long and clipped in PDF/SVG.
* Selection boxes use bounding boxes; crossing can include an arc/circle whose box, but not outline, touches the window.
* Text width is approximated (0.55–0.6 × height per character) for selection and centring; fonts are the browser's sans-serif on screen and Helvetica (Latin-1) in PDF.
* On browsers without the File System Access API (Firefox, Safari) Save downloads a copy instead of overwriting.
* Autosave is limited by browser storage (about 5 MB).
* Undo history is not stored in files. Very large drawings are untested.

## First-run checklist (about 10 minutes)
1. Draw a line, circle, arc and rectangle; click each and edit a value in Properties.
2. Type `LINE 0,0` then `@100<45` then `@50,0`.
3. Hover where two lines cross: an Intersection marker should appear.
4. Select objects and try `MOVE`, `ROTATE`, then Ctrl+Z.
5. Add an aligned dimension to a line; change the line in Properties and watch the value change.
6. Save As, refresh, Open. Draw something, refresh without saving: recovery should be offered.
7. Export DXF and open it in LibreCAD or another CAD program.
8. Layout → Fit model to viewport → Export PDF; check the scale against a known length.
9. Civil toolbox: paste `1,100,200,45.2,MH` into Survey points and Plot.
Report anything that fails; each item maps to code and tests described above.
