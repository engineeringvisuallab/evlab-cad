export const ALIASES = { L: 'LINE', LINE: 'LINE', PL: 'PLINE', PLINE: 'PLINE', C: 'CIRCLE', CIRCLE: 'CIRCLE', A: 'ARC', ARC: 'ARC', REC: 'RECTANGLE', RECTANGLE: 'RECTANGLE',
  E: 'ERASE', ERASE: 'ERASE', LA: 'LAYER', LAYER: 'LAYER', ZOOM: 'ZOOM', PAN: 'PAN', DI: 'DIST', DIST: 'DIST', ORTHO: 'ORTHO', OSNAP: 'OSNAP', SNAP: 'SNAP', HELP: 'HELP' };
const m4 = 'MOVE M COPY CO ROTATE RO SCALE SC MIRROR MI OFFSET O TRIM TR EXTEND EX FILLET F CHAMFER CHA EXPLODE X JOIN J DIMLINEAR DLI DIMALIGNED DAL AREA UNDO U REDO'.split(' ');
export const PLANNED = { ...Object.fromEntries(m4.map(k => [k, 'Milestone 4'])), SAVE: 'Milestone 5', OPEN: 'Milestone 5', ELLIPSE: 'a later milestone', EL: 'a later milestone' };
export const TOOL_OF = { LINE: 'line', PLINE: 'polyline', CIRCLE: 'circle', ARC: 'arc', RECTANGLE: 'rect', DIST: 'dist' };
