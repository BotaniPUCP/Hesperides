undef $/; $_=<STDIN>; my $n=0;
sub r { my ($a,$b)=@_; my $i=index($_,$a); die "no: $a" if $i<0; substr($_,$i,length $a)=$b; }
r("  const [loadingSections, setLoadingSections] = useState(true);\n  const [loadingTurns, setLoadingTurns] = useState(true);\n",
"  // Cada carga recuerda para qué entrada terminó; «cargando» se deriva de\n  // comparar con la entrada actual y los efectos no escriben estado al empezar.\n  const [sectionsLoadedFor, setSectionsLoadedFor] = useState<IrrigationZone[] | null>(null);\n  const [turnsLoadedFor, setTurnsLoadedFor] = useState<string | null>(null);\n");
r("  const [message, setMessage] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);\n",
"  const [message, setMessage] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);\n  const turnsQuery = `\${historySector}|\${from}|\${to}|\${refresh}`;\n  const loadingSections = isSupervisor && sectors.length > 0 && sectionsLoadedFor !== sectors;\n  const loadingTurns = turnsLoadedFor !== turnsQuery;\n");
r("    let live = true;\n    setLoadingSectors(true);\n    irrigationApi.sectors()", "    let live = true;\n    irrigationApi.sectors()");
r("    let live = true;\n    if (!isSupervisor || sectors.length === 0) {\n      setSectionsBySector({});\n      setLoadingSections(false);\n      return;\n    }\n    setLoadingSections(true);\n",
"    if (!isSupervisor || sectors.length === 0) return;\n    let live = true;\n");
r(".finally(() => { if (live) setLoadingSections(false); });", ".finally(() => { if (live) setSectionsLoadedFor(sectors); });");
r("    let live = true;\n    setLoadingTurns(true);\n    irrigationApi.turns", "    let live = true;\n    irrigationApi.turns");
r(".finally(() => { if (live) setLoadingTurns(false); });\n    return () => { live = false; };\n  }, [historySector, from, to, refresh]);",
".finally(() => { if (live) setTurnsLoadedFor(turnsQuery); });\n    return () => { live = false; };\n    // turnsQuery resume historySector, from, to y refresh.\n    // eslint-disable-next-line react-hooks/exhaustive-deps\n  }, [turnsQuery]);");
print;
