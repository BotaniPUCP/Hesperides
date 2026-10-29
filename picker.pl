undef $/; $_=<STDIN>;
sub r { my ($a,$b)=@_; my $i=index($_,$a); die "no: $a" if $i<0; substr($_,$i,length $a)=$b; }
r("interface DragBox { startX: number; startY: number; endX: number; endY: number; }",
"/** Coordenadas de cliente más el origen del mapa, leído al empezar: el render no toca refs. */\ninterface DragBox { startX: number; startY: number; endX: number; endY: number; originX: number; originY: number; }");
r("    setDrag({ startX: e.clientX, startY: e.clientY, endX: e.clientX, endY: e.clientY });",
"    const origin = mapRegion.current?.getBoundingClientRect();\n    setDrag({ startX: e.clientX, startY: e.clientY, endX: e.clientX, endY: e.clientY, originX: origin?.left ?? 0, originY: origin?.top ?? 0 });");
r("    setDrag({ startX: dragStart.current.x, startY: dragStart.current.y, endX: e.clientX, endY: e.clientY });",
"    setDrag((prev) => prev && { ...prev, endX: e.clientX, endY: e.clientY });");
r("style={{ left: Math.min(drag.startX, drag.endX) - ((mapRegion.current?.getBoundingClientRect().left ?? 0)),\n                  top: Math.min(drag.startY, drag.endY) - ((mapRegion.current?.getBoundingClientRect().top ?? 0)),",
"style={{ left: Math.min(drag.startX, drag.endX) - drag.originX,\n                  top: Math.min(drag.startY, drag.endY) - drag.originY,");
print;
